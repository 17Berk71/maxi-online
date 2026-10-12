import unittest
import cv2
import numpy as np
from capture import remove_measurement_tape, neutralize_surface

class CaptureTests(unittest.TestCase):
    def test_tape_cleanup_does_not_remove_orange_outside_reviewed_region(self):
        image = np.full((160, 200, 3), 42, np.uint8)
        image[70:80, 40:160] = (15, 145, 245)
        image[74:77, 90:94] = 0  # black ticks on the tape
        image[10:25, 40:160] = (15, 145, 245)  # unrelated orange print
        out, mask = remove_measurement_tape(image, [.15, .38, .85, .6])
        np.testing.assert_array_equal(out[10:25], image[10:25])
        self.assertLess(out[70:80, 40:160].max(), 60)
        self.assertTrue((mask[74:77, 90:94] > 0).all())

    def test_lighting_reduction_preserves_outside_mask_and_dark_seam(self):
        image = np.full((200, 200, 3), 80, np.uint8)
        image[20:180, 20:180] = np.linspace(40, 110, 160).astype('uint8')[None,:,None]
        image[20:180, 99:101] = 15
        mask = np.zeros((200, 200), np.uint8); mask[20:180,20:180] = 1
        out = neutralize_surface(image, mask)
        np.testing.assert_array_equal(out[mask==0], image[mask==0])
        self.assertLess(out[50,99].mean(),out[50,80].mean()*.6)
        self.assertLess(abs(float(out[50,150].mean())-float(out[50,50].mean())),abs(float(image[50,150].mean())-float(image[50,50].mean())))

if __name__ == '__main__': unittest.main()
