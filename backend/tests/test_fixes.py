import asyncio
import pytest
from app import github as gh
from app.ai import ResumeTailor, _plural
from app.resume import generate_resume_latex


def proj(n, **k):
    d = {"name": n, "description": "", "language": "Python", "topics": [], "commits": [], "readme": "",
         "repo_languages": {}, "dependencies": [], "file_tree": []}
    d.update(k)
    return d


def gen(projects):
    a = {"username": "u", "public_repos": len(projects), "total_stars": 1, "top_projects": projects,
         "detected_skills": {"languages": ["Python"], "frameworks": [], "tools": []}, "languages": []}
    return ResumeTailor().generate_resume_from_github(a)


def test_no_selected_repo_dropped():
    names = [f"r{i}" for i in range(6)]
    res = gen([proj(n) for n in names])
    assert [p["name"] for p in res["projects"]] == names


def test_merge_only_repo_kept():
    res = gen([proj("a"), proj("b"), proj("c"), proj("Last", commits=[{"message": "Merge pull request #1"}])])
    assert "Last" in [p["name"] for p in res["projects"]]


def test_fallback_only_facts():
    p = proj("shop", description="a marketplace for used books", dependencies=["FastAPI"],
             repo_languages={"Python": 900, "JS": 100}, readme="# T\n\nSells books online. More.",
             commits=[{"message": "feat: add cart"}, {"message": "Merge branch main"}])
    res = gen([p])["projects"][0]
    text = " ".join(res["bullets"])
    print(res["bullets"])
    for bad in ["micro-caching", "multi-tier", "migrations", "machine learning", "premium", "scalab"]:
        assert bad not in text.lower()
    assert "A marketplace for used books." in res["bullets"]
    assert "Written in Python, JS using FastAPI." in res["bullets"]
    assert not any("Merge" in b for b in res["bullets"])


def test_no_padding_projects():
    assert len(gen([proj("only")])["projects"]) == 1


def test_plural():
    assert _plural(1, "star") == "1 star" and _plural(0, "star") == "0 stars" and _plural(2, "star") == "2 stars"
    d = gen([proj("x")])["achievements"][0]["description"]
    assert "1 star" in d and "1 stars" not in d


class R:
    def __init__(self, code, headers=None):
        self.status_code, self.headers, self.text = code, headers or {}, ""


class C:
    def __init__(self, r):
        self.r = r

    async def get(self, url, headers=None, timeout=10):
        return self.r


@pytest.mark.parametrize("code,hdr,status", [(403, {"X-RateLimit-Remaining": "0"}, 429), (404, {}, 404)])
def test_anon_failure_is_error_not_mock(code, hdr, status):
    gh.GitHubCache._cache.clear()
    with pytest.raises(gh.GitHubError) as e:
        asyncio.run(gh.GitHubAnalyzer().fetch_user_data_rest(C(R(code, hdr)), "zz"))
    assert e.value.status == status


def test_warnings():
    a = gh.GitHubAnalyzer()
    assert a._rate_warnings() == []
    a._rate_limit_remaining = 1
    asyncio.run(a.fetch_repo_readme(None, "o", "r1"))
    asyncio.run(a.fetch_repo_context(None, "o", "r1"))
    asyncio.run(a.fetch_repo_context(None, "o", "r2"))
    assert a._rate_warnings() == ["GitHub rate limit reached; 2 repos scanned without README/languages. Add a token."]


def render(skills):
    d = {"name": "N", "email": "e", "phone": "", "linkedin": "", "github": "https://github.com/u", "course": "",
         "roll": "", "website": "", "summary": "s", "skills": skills, "experience": [], "projects": [],
         "education": [], "achievements": [], "coursework": {"cs": "", "math": ""}, "positions": []}
    return generate_resume_latex(d, "iit")


def test_tex_empty_rows():
    t = render({"languages": ["Python"], "frameworks": [], "tools": []})
    assert "Programming languages" in t and "Web Technologies" not in t and "Tools" not in t
    t = render({"languages": [], "frameworks": [], "tools": []})
    assert "Technical Skills" not in t and "Education" not in t
    t = render({"languages": [], "frameworks": [], "tools": ["Git"]})
    assert "Tools" in t and "Programming languages" not in t and "Web Technologies" not in t
    t = render({"languages": ["P"], "frameworks": ["F"], "tools": ["Git"]})
    assert "Web Technologies" in t and "Tools" in t


def test_prompt_has_no_fabrication_seeds():
    import inspect
    from app import ai
    src = inspect.getsource(ai).lower()
    for bad in ["elite", "premium", "world-class", "15 interactive", "retention", "technical innovation award"]:
        assert bad not in src, bad


def test_fallback_no_chips_no_dates():
    pr = gen([proj("bare", language=None)])["projects"][0]
    assert pr["tech"] == [] and pr["start_date"] == "" and pr["end_date"] == ""


@pytest.mark.parametrize("tid", ["iit", "jakes", "modern", "twocol"])
def test_templates_empty_project_dates(tid):
    d = {"name": "N", "email": "e", "phone": "", "linkedin": "", "github": "https://github.com/u", "course": "",
         "roll": "", "website": "", "summary": "s", "skills": {"languages": ["P"], "frameworks": [], "tools": []},
         "experience": [], "projects": [{"name": "Pj", "tech": [], "start_date": "", "end_date": "", "url": "",
                                         "bullets": ["b"]}],
         "education": [], "achievements": [], "coursework": {"cs": "", "math": ""}, "positions": []}
    t = generate_resume_latex(d, tid)
    assert "Pj" in t
    assert " - }" not in t and "-- }" not in t and "{ - " not in t and "{ -- " not in t
    assert "{ - }" not in t and " - \n" not in t


def run(coro):
    return asyncio.run(coro)


def test_commits_no_budget_returns_empty():
    a = gh.GitHubAnalyzer()
    a._rate_limit_remaining = 1
    assert run(a.fetch_user_commits(None, "o", "r", "u")) == []
    assert "r" in a._skipped


def test_commits_http_error_returns_empty():
    a = gh.GitHubAnalyzer()
    assert run(a.fetch_user_commits(C(R(500)), "o", "r", "u")) == []
    assert "r" in a._skipped


class Seq:
    def __init__(self, rs):
        self.rs = list(rs)

    async def get(self, url, headers=None, timeout=10):
        return self.rs.pop(0)


class J(R):
    def json(self):
        return {"login": "u"}


def test_repo_list_failure_raises():
    for code, want in [(403, 429), (500, 502)]:
        with pytest.raises(gh.GitHubError) as e:
            run(gh.GitHubAnalyzer().fetch_user_data_rest(Seq([J(200), R(code)]), "u"))
        assert e.value.status == want
