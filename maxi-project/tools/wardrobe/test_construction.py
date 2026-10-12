import unittest
from construction import estimate_construction

class ConstructionTests(unittest.TestCase):
    def test_references_use_pixel_aspect_and_are_resolution_independent(self):
        recipe={'reference_width_cm':50,'landmarks':{'width':[[.25,.2],[.75,.2]],'len':[[.5,.2],[.5,.8]],'shoulder':[[.3,.2],[.7,.2]],'sleeves':[[[.3,.2],[.2,.3]]]}}
        a=estimate_construction(recipe,1000,1500)
        b=estimate_construction(recipe,2000,3000)
        self.assertEqual(a['dimensions'],b['dimensions'])
        self.assertEqual(a['dimensions']['len'],90)
        self.assertEqual(a['dimensions']['shoulder'],40)
        self.assertTrue(a['estimated'])

    def test_missing_or_invalid_scale_is_rejected(self):
        for width in [0,-1,float('nan')]:
            with self.assertRaises(ValueError): estimate_construction({'reference_width_cm':width,'landmarks':{'width':[[.2,.2],[.8,.2]]}},1000,1000)
        with self.assertRaises(ValueError): estimate_construction({'reference_width_cm':54,'landmarks':{'width':[[.2,.2],[.2,.2]]}},1000,1000)

if __name__=='__main__': unittest.main()
