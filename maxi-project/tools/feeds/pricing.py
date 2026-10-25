"""Lossless-enough optional numeric price parsing; never invent a zero."""
from decimal import Decimal, InvalidOperation


def parse_price(raw):
    if raw is None or isinstance(raw, bool):
        return None
    try:
        value = Decimal(str(raw).replace(' ', '').replace('\u00a0', '').replace(',', '.'))
        if not value.is_finite() or value < 0:
            return None
        result = float(value)
        if result == float('inf'):
            return None
        return int(value) if value == value.to_integral_value() else result
    except (InvalidOperation, ValueError, OverflowError):
        return None
