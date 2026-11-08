import os
import shutil
import subprocess
import tempfile
from pathlib import Path


class LatexCompileError(Exception):
    def __init__(self, message: str, log: str = ""):
        super().__init__(message)
        self.log = log


def find_tectonic():
    env_bin = os.environ.get("TECTONIC_BIN")
    if env_bin and Path(env_bin).exists():
        return env_bin
    found = shutil.which("tectonic")
    if found:
        return found
    local = Path.home() / ".local" / "bin" / "tectonic"
    return str(local) if local.exists() else None


def _tail(text: str, n: int = 40) -> str:
    return "\n".join(text.strip().splitlines()[-n:])


def compile_pdf(latex: str, timeout: int = 180) -> bytes:
    exe = find_tectonic()
    if not exe:
        raise FileNotFoundError("Tectonic is not installed on the server.")
    with tempfile.TemporaryDirectory(prefix="gitresume-") as tmp:
        src = Path(tmp) / "resume.tex"
        src.write_text(latex, encoding="utf-8")
        try:
            proc = subprocess.run(
                [exe, "-X", "compile", "--keep-logs", "resume.tex"],
                cwd=tmp, capture_output=True, text=True, timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            raise LatexCompileError("LaTeX compile timed out.")
        pdf = Path(tmp) / "resume.pdf"
        if proc.returncode != 0 or not pdf.exists():
            log_file = Path(tmp) / "resume.log"
            log = log_file.read_text(errors="replace") if log_file.exists() else ""
            first = next((l for l in (proc.stderr + "\n" + log).splitlines() if l.startswith("!") or "error:" in l), "LaTeX compile failed.")
            raise LatexCompileError(first.strip(), _tail(proc.stderr + "\n" + log))
        return pdf.read_bytes()
