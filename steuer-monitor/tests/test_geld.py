from decimal import Decimal as Dec

from estmon.geld import de, eur, parse_de


def test_deutsches_zahlenformat():
    assert de(Dec("1234567.891")) == "1.234.567,89"
    assert de(Dec("-0.004")) == "0,00"
    assert eur(Dec("35425.52")) == "35.425,52 €"
    assert de(12348, 0) == "12.348"


def test_parse_de():
    assert parse_de("16.660,00") == Dec("16660.00")
    assert parse_de("-8146,00") == Dec("-8146.00")
    assert parse_de("1234.56") == Dec("1234.56")
    assert parse_de("1.500") == Dec("1500") and parse_de("1.234.567") == Dec("1234567")
