import unittest
from pricing import parse_price


class PricingTests(unittest.TestCase):
    def test_unknown_is_not_zero(self):
        for raw in (None, '', 'invalid', 'NaN', 'Infinity', '-10', True):
            self.assertIsNone(parse_price(raw), raw)

    def test_valid_prices_keep_cents(self):
        self.assertEqual(parse_price('1250.50'), 1250.5)
        self.assertEqual(parse_price('1 250,50'), 1250.5)
        self.assertEqual(parse_price('0'), 0)


if __name__ == '__main__':
    unittest.main()
