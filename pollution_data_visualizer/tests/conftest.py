import warnings
import pytest

@pytest.fixture(autouse=True)
def ignore_warnings():
    warnings.simplefilter("ignore")
    yield
