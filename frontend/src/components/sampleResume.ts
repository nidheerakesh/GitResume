import type { ResumeData } from '../types';

// Fictional sample shown on the landing page. It is not anyone's real resume.
export const SAMPLE_RESUME: ResumeData = {
  name: 'Alex Morgan',
  email: 'alex@example.com',
  phone: '+1 555 0100',
  linkedin: 'https://linkedin.com/in/alex-morgan',
  github: 'https://github.com/alex-morgan',
  course: 'B.Sc. Computer Science',
  roll: '',
  website: '',
  summary: 'Backend engineer who builds data pipelines and small, well-tested services.',
  skills: {
    languages: ['Python', 'Go', 'SQL'],
    frameworks: ['FastAPI', 'React'],
    tools: ['Docker', 'PostgreSQL', 'GitHub Actions'],
  },
  experience: [],
  projects: [
    {
      name: 'queue-lab',
      tech: ['Go', 'Redis'],
      start_date: 'Jan 2025',
      end_date: 'Present',
      url: 'https://github.com/alex-morgan/queue-lab',
      bullets: [
        'Built a job queue with at-least-once delivery, cutting duplicate runs to zero in load tests.',
        'Wrote a benchmark harness that runs in CI and flags regressions above 5 percent.',
      ],
      hidden: false,
    },
    {
      name: 'ledger-api',
      tech: ['Python', 'FastAPI', 'PostgreSQL'],
      start_date: 'Aug 2024',
      end_date: 'Dec 2024',
      url: 'https://github.com/alex-morgan/ledger-api',
      bullets: [
        'Designed a REST API for double-entry bookkeeping with 90 percent test coverage.',
      ],
      hidden: false,
    },
  ],
  education: [
    {
      school: 'State University',
      degree: 'B.Sc. Computer Science',
      start_date: '2022',
      end_date: '2026',
      gpa: '3.8/4.0',
    },
  ],
  achievements: [
    { title: 'Hackathon finalist', description: 'Top 5 of 120 teams', year: '2025' },
  ],
  coursework: {
    cs: 'Distributed systems, Databases, Compilers',
    math: 'Linear algebra, Probability',
  },
  positions: [],
};
