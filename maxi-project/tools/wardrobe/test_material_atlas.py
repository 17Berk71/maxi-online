import unittest
import numpy as np
from material_atlas import clean_border_chroma, fabric_patch


class MaterialAtlasTest(unittest.TestCase):
    def test_crop_frame_is_a_mask_edge_and_interior_print_is_unchanged(self):
        a = np.full((160, 120, 4), [110, 135, 160, 255], dtype=np.uint8)
        a[125:, 5:16, :3] = [140, 140, 90]
        a[60:75, 60:70, :3] = [20, 20, 220]
        b, count = clean_border_chroma(a)
        self.assertGreater(count, 0)
        self.assertTrue((b[140:, 7:14, 3] == 0).all())
        np.testing.assert_array_equal(b[60:75, 60:70], a[60:75, 60:70])

    def test_swatch_does_not_sample_background_and_has_matching_tile_edges(self):
        a = np.full((240, 160, 4), [100, 130, 160, 255], dtype=np.uint8)
        a[:, :20, 3] = 0
        a[:, -20:, 3] = 0
        tile, spec = fabric_patch(a, {'cx': .5, 'hw': .28})
        np.testing.assert_array_equal(tile[:, 0], tile[:, -1])
        np.testing.assert_array_equal(tile[0], tile[-1])
        self.assertEqual(spec['scale'], 'estimated')
        self.assertGreater(spec['widthM'], 0)

    def test_unknown_fabric_is_rejected_instead_of_making_a_texture(self):
        with self.assertRaises(ValueError):
            fabric_patch(np.zeros((160, 120, 4), dtype=np.uint8), {'cx': .5, 'hw': .28})


if __name__ == '__main__':
    unittest.main()
