import jinja2
import re

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

LATEX_TEMPLATE = r"""%-------------------------
% Resume in Latex
% Author : Tejas Khairnar
% Generated via GitResume
%------------------------

\documentclass[a4paper,11pt]{article}
\usepackage{latexsym}
\usepackage{xcolor}
\usepackage{float}
\usepackage{ragged2e}
\usepackage[empty]{fullpage}
\usepackage{wrapfig}
\usepackage{lipsum}
\usepackage{tabularx}
\usepackage{titlesec}
\usepackage{geometry}
\usepackage{marvosym}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage{multicol}
\usepackage{graphicx}
\usepackage{cfr-lm}
\usepackage[T1]{fontenc}
\usepackage{fontawesome}
\usepackage[most]{tcolorbox}

% Set the margins
\geometry{left=0.85cm, top=0.8cm, right=0.85cm, bottom=0.2cm}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-7pt}]

%-------------------------
% Custom commands

\newcommand{\resumePOR}[3]{
\vspace{0.5mm}\item[]
    \begin{tabular*}{\textwidth}[t]{l@{\extracolsep{\fill}}r}
    \hspace{-3mm}{#1}:\hspace{1mm} & \hspace*{0pt}\hfill{\footnotesize{ #3}} \vspace{-0.5mm}\\ \hspace{-2.9mm}#2 
    \end{tabular*}
    \vspace{0mm}
}

\newcommand{\resumeExp}[4]{
\vspace{0mm}\item[]
    \begin{tabular*}{\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \hspace{-4.4mm} \small\textbf{#1} & {\footnotesize{#3}}\vspace{-1.2mm}\\
        \hspace{-4.3mm} \footnotesize{\text{#2}} & \footnotesize{#4}
    \end{tabular*}
    \vspace{-6.1mm}
}

\newcommand{\resumeProject}[4]{
\vspace{0mm}\item[]
    \begin{tabular*}{\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \hspace{-4.4mm} \small\textbf{#1} & {\footnotesize{#3}}\vspace{-1mm}\\
        \hspace{-4.3mm} \footnotesize{\text{#2}} & \footnotesize{#4}
    \end{tabular*}
    \vspace{-6.5mm}
}

\newcommand{\resumeEdu}[4]{
\vspace{0mm}\item[]
    \begin{tabular*}{\textwidth}[t]{l@{\extracolsep{\fill}}r}
        \hspace{-4.3mm} \small\textbf{#1} & \footnotesize{#3}\vspace{-1mm} \\
        \hspace{-4.3mm} \footnotesize{#2} & \footnotesize{#4}
    \end{tabular*}
    \vspace{-3.2mm}
}

\newcommand{\resumeAchieve}[3]
{
\hspace{-3.1mm}\textbf{ #1} & {#2} & \hspace{3mm}\footnotesize{#3}
\vspace{0mm}\\
}

\renewcommand{\labelitemi}{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=*,labelsep=0mm,itemsep=-2.5mm]}

\newcommand{\resumeItemListStart}{\begin{justify}\begin{itemize}[leftmargin=3ex, rightmargin=2ex, noitemsep,labelsep=1.2mm,itemsep=0mm]\small}

\newcommand{\resumeSubHeadingListEnd}{\end{itemize}\vspace{-2mm}}
\newcommand{\resumeItemListEnd}{\end{itemize}\end{justify}\vspace{-1.5mm}}

\renewcommand{\arraystretch}{1}

\newcolumntype{L}{>{\raggedright\arraybackslash}X}%
\newcolumntype{R}{>{\raggedleft\arraybackslash}X}%
\newcolumntype{C}{>{\centering\arraybackslash}X}%

%-------------------------------------------
%%%%%%  CV STARTS HERE  %%%%%%%%%%%

\newcommand{\name}{<< name >>} % Your Name
\newcommand{\course}{<< course >>} % Your Course
\newcommand{\roll}{<< roll >>} % Your Roll No.
\newcommand{\phone}{<< phone >>} % Your Phone Number
\newcommand{\emaila}{<< email >>} % Email
\newcommand{\github}{<< github_username >>} % Github short
\newcommand{\website}{<< website >>} % Website
\newcommand{\linkedin}{<< linkedin_username >>} % Linkedin short

\begin{document}
\fontfamily{cmr}\selectfont

%----------HEADING-----------------
\begin{center}
    \LARGE{\textbf{\name}}
\end{center}
\vspace{-6.5mm}
\begin{center}
    \small{
        <% set contact_parts = [] %>
        <% if github_username %>
        <% set _ = contact_parts.append("\\href{https://github.com/" + github_username + "}{\\faGithub \\hspace{0.2mm} github.com/" + github_username + "}") %>
        <% endif %>
        <% if linkedin_username %>
        <% set _ = contact_parts.append("\\href{https://www.linkedin.com/in/" + linkedin_username + "/}{\\faLinkedinSquare \\hspace{0.2mm} linkedin.com/in/" + linkedin_username + "}") %>
        <% endif %>
        <% if email %>
        <% set _ = contact_parts.append("\\href{mailto:" + email + "}{\\faSend \\hspace{0.2mm} " + email + "}") %>
        <% endif %>
        <% if phone %>
        <% set _ = contact_parts.append("\\faPhone \\hspace{0.2mm} " + phone) %>
        <% endif %>
        << contact_parts | join(' | ') >>
    }
\end{center}
\vspace{-3mm}

<% if education %>
%-----------EDUCATION-----------------
\vspace{-2.5mm}
\section{Education}
\resumeSubHeadingListStart
<% for edu in education %>
\resumeEdu
{<< edu.school >>} 
{<< edu.degree >>} 
{<< edu.start_date >> - << edu.end_date >>} 
{GPA: << edu.gpa >>}
<% endfor %>
\resumeSubHeadingListEnd
\vspace{-3.5mm}
<% endif %>

<% if experience %>
%-----------EXPERIENCE-----------------
\section{Experience}
\resumeSubHeadingListStart
<% for job in experience %>
\resumeExp
{<< job.company >>}
{<< job.title >>}
{<< job.start_date >> - << job.end_date >>}
{<< job.location >>}
\resumeItemListStart
<% for bullet in job.bullets %>
\item[$\bullet$] << bullet >>
<% endfor %>
\resumeItemListEnd
<% endfor %>
\resumeSubHeadingListEnd
\vspace{-5.5mm}
<% endif %>

%-----------PROJECTS-----------------
\section{Projects}
\resumeSubHeadingListStart
<% for project in projects %>
\resumeProject
{<< project.name >>}
{<< project.tech | join(', ') >>}
{<< project.start_date >> - << project.end_date >>}
{\href{<< project.url >>}{GitHub}}
\resumeItemListStart
<% for bullet in project.bullets %>
\item[$\bullet$] << bullet >>
<% endfor %>
\resumeItemListEnd
<% endfor %>
\resumeSubHeadingListEnd
\vspace{-5.5mm}

<% if achievements %>
%-----------ACHIEVEMENTS-----------------
\section{Achievements}
\vspace{0.2mm}
\small{\begin{tabular*}{\textwidth}[t]{p{0.22\textwidth} p{0.68\textwidth}@{\extracolsep{\fill}}r}
<% for ach in achievements %>
\resumeAchieve{<< ach.title >>}{<< ach.description >>}{<< ach.year >>}
<% endfor %>
\end{tabular*}}
\vspace{-2.5mm}
<% endif %>

%-----------TECHNICAL SKILLS-----------------
\section{Technical Skills}
\vspace{0.2mm}
\small{\begin{tabular*}{\textwidth}[t]{p{0.5\textwidth} p{0.5\textwidth}}
\hspace{-3.1mm}{\textbf{ Programming languages:} << skills.languages | join(', ') >>} & {\textbf{Web Technologies:} << skills.frameworks | join(', ') >>} \\  
\hspace{-3.1mm}{\textbf{ Tools \& Databases:} << skills.tools | join(', ') >>} & {}
\end{tabular*}}
\vspace{-2.5mm}

<% if coursework and (coursework.cs or coursework.math) %>
%-----------COURSEWORK-----------------
\section{Relevant Coursework}
\vspace{0.2mm}
\small{\begin{tabular*}{\textwidth}[t]{p{\textwidth}}
<% if coursework.cs %>
\hspace{-3.1mm}\textbf{ Computer Science: }{<< coursework.cs >>}\\
<% endif %>
<% if coursework.math %>
\hspace{-3.1mm}\textbf{ Mathematics: }{<< coursework.math >>}
<% endif %>
\end{tabular*}}
\vspace{-2.5mm}
<% endif %>

<% if positions %>
%-----------POSITIONS OF RESPONSIBILITY-----------------
\section{Positions of Responsibility}
\vspace{-0.4mm}
\resumeSubHeadingListStart
<% for por in positions %>
\resumePOR{\textbf{<< por.title >>}}
{<< por.description >>}
{\raisebox{0.75pt}{<< por.year >>}}
\vspace{0.5mm}
<% endfor %>
\resumeSubHeadingListEnd
\hspace*{-2mm}\rule{1.030\textwidth}{0.1mm}
\vspace{0mm}
<% endif %>

\end{document}
"""

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

def generate_resume_latex(data: dict) -> str:
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
    
    template = latex_jinja_env.from_string(LATEX_TEMPLATE)
    return template.render(**sanitized_data)
