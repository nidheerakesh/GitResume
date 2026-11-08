import jinja2
import re
from pathlib import Path

# Custom Jinja2 Environment for LaTeX to avoid { } conflicts
latex_jinja_env = jinja2.Environment(
    block_start_string='<%',
    block_end_string='%>',
    variable_start_string='<<',
    variable_end_string='>>',
    comment_start_string='<#',
    comment_end_string='#>',
    autoescape=False
)

TEMPLATE_DIR = Path(__file__).parent / "templates"

TEMPLATES = [
    {"id": "iit", "name": "IIT style", "description": "Academic one-column with roll number, coursework and positions."},
    {"id": "jakes", "name": "Jake's Resume", "description": "Classic one-column ATS layout used by most tech applicants."},
    {"id": "modern", "name": "Modern minimal", "description": "Sans-serif one-column with a colored accent."},
    {"id": "twocol", "name": "Compact two-column", "description": "Sidebar for skills and education to fit more on one page."},
]
TEMPLATE_IDS = {t["id"] for t in TEMPLATES}
DEFAULT_TEMPLATE = "iit"


def load_template(template_id: str) -> str:
    if template_id not in TEMPLATE_IDS:
        raise ValueError(f"Unknown template '{template_id}'")
    return (TEMPLATE_DIR / f"{template_id}.tex.j2").read_text()

def sanitize_latex(text: str) -> str:
    """
    Escapes special LaTeX characters to prevent compile errors and LaTeX injection.
    """
    if not isinstance(text, str):
        return text
    
    # Map of special characters to escape
    special_chars = {
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
        '\\': r'\textbackslash{}',
    }
    
    # Regex to match special characters
    regex = re.compile('|'.join(re.escape(str(key)) for key in special_chars.keys()))
    return regex.sub(lambda match: special_chars[match.group()], text)

def generate_resume_latex(data: dict, template_id: str = DEFAULT_TEMPLATE) -> str:
    """
    Takes structural resume data and generates compiled, ATS-ready LaTeX source code.
    """
    # Create a deep copy to sanitize
    sanitized_data = {}
    
    # Simple sanitization helper
    def clean_obj(obj):
        if isinstance(obj, str):
            return sanitize_latex(obj)
        elif isinstance(obj, list):
            return [clean_obj(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: clean_obj(v) for k, v in obj.items()}
        return obj

    sanitized_data = clean_obj(data)

    # Perform custom pre-parsing for headings and variables
    # Extract short usernames for \github and \linkedin
    github_val = str(data.get("github", ""))
    github_user = github_val.split("/")[-1] if "/" in github_val else github_val
    if github_user.endswith("/"): github_user = github_user[:-1]
    sanitized_data["github_username"] = sanitize_latex(github_user)

    linkedin_val = str(data.get("linkedin", ""))
    linkedin_user = linkedin_val.split("/")[-1] if "/" in linkedin_val else linkedin_val
    if linkedin_user.endswith("/"): linkedin_user = linkedin_user[:-1]
    # Handle possible /in/ link segment
    if linkedin_user == "in" and "/" in linkedin_val:
         parts = linkedin_val.split("/")
         if len(parts) > 2:
              linkedin_user = parts[-1] if parts[-1] else parts[-2]
    sanitized_data["linkedin_username"] = sanitize_latex(linkedin_user)

    # Inject defaults for template-specific macros
    sanitized_data["course"] = sanitize_latex(data.get("course", "B.Tech - Computer Science and Engineering"))
    sanitized_data["roll"] = sanitize_latex(data.get("roll", "xxxxxxxx"))
    sanitized_data["website"] = sanitize_latex(data.get("website", "https://example.com"))

    # Default fallbacks for new structures if missing in dictionary
    if "achievements" not in sanitized_data:
        sanitized_data["achievements"] = []
    if "coursework" not in sanitized_data:
        sanitized_data["coursework"] = {"cs": "", "math": ""}
    if "positions" not in sanitized_data:
        sanitized_data["positions"] = []
    
    template = latex_jinja_env.from_string(load_template(template_id))
    return template.render(**sanitized_data)
