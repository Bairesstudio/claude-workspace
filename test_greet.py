from greet import greet


def test_greet_default():
    assert greet("World") == "Hello, World!"


def test_greet_custom_name():
    assert greet("Claude") == "Hello, Claude!"
