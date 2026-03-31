from __future__ import annotations

from dataclasses import dataclass
from random import Random


FIRST_NAMES = [
    "Ava",
    "Noah",
    "Liam",
    "Mia",
    "Elena",
    "Zara",
    "Daniel",
    "Grace",
    "Ivy",
    "Jonah",
    "Micah",
    "Ruth",
    "Ethan",
    "Mason",
    "Sophia",
    "David",
    "Leah",
    "Nora",
    "Mariam",
    "Caleb",
]

LAST_NAMES = [
    "Mensah",
    "Cole",
    "Kebeh",
    "Martinez",
    "Sharma",
    "Diallo",
    "Brown",
    "Okoro",
    "Johnson",
    "Bennett",
    "Harris",
    "Nguyen",
    "Singh",
    "Wright",
    "Cooper",
]

DEPARTMENTS = {
    "Finance": ["Risk Analyst", "Payroll Officer", "Treasury Coordinator"],
    "Operations": ["Operations Lead", "Shift Analyst", "Field Coordinator"],
    "Engineering": ["Platform Engineer", "Security Engineer", "Systems Analyst"],
    "Human Resources": ["HR Specialist", "People Ops Partner", "Talent Coordinator"],
    "Sales": ["Account Executive", "Regional Sales Lead", "Revenue Associate"],
    "Legal": ["Compliance Counsel", "Legal Analyst", "Policy Manager"],
    "Research": ["Research Lead", "Data Steward", "Insights Analyst"],
}


@dataclass(frozen=True)
class SeedEmployee:
    employee_code: str
    name: str
    department: str
    title: str
    baseline_profile: dict[str, object]


def generate_seed_employees(count: int, seed: int = 17) -> list[SeedEmployee]:
    random = Random(seed)
    employees: list[SeedEmployee] = []
    department_names = list(DEPARTMENTS.keys())

    for index in range(1, count + 1):
        department = department_names[index % len(department_names)]
        title = random.choice(DEPARTMENTS[department])
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        login_start = random.randint(7, 10)
        login_end = login_start + random.randint(7, 9)
        baseline = {
            "login_window": {"start": login_start, "end": min(login_end, 20)},
            "downloads_per_hour": random.randint(2, 6),
            "typical_transfer_mb": random.randint(40, 180),
            "usb_allowed": department in {"Operations", "Research"},
            "sensitive_access_level": "high" if department in {"Finance", "Legal"} else "medium",
            "home_location": random.choice(["HQ-West", "HQ-East", "Branch-Delta", "Remote"]),
        }
        employees.append(
            SeedEmployee(
                employee_code=f"EMP-{index:03d}",
                name=name,
                department=department,
                title=title,
                baseline_profile=baseline,
            )
        )
    return employees
