from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
FIXTURE = REPO / "private" / "stl_in" / "b_fixture_a.stl"


@pytest.fixture(scope="session")
def fixture_path() -> Path:
    if not FIXTURE.exists():
        pytest.skip("private/stl_in/b_fixture_a.stl not present")
    return FIXTURE
