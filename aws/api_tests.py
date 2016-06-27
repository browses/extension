"""
api_tests.py

AWS API Gateway Test Suite for Browses.

@dependencies:
    - requests
@run:
    - python api_tests.py
"""
import requests
import unittest

BROWSE_URL = "https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta"
LOGINN_URL = "https://7ibd5w7y69.execute-api.eu-west-1.amazonaws.com/beta"


class TestBrowsesAuth(unittest.TestCase):
    """
    Test authenticated resources, using token from loginns.
    Check API's basic functionality and response content.
    """
    @classmethod
    def setUpClass(cls):
        cls.user = "joebloggs"
        cls.pwd = "salted_hash"
        cls.service = "https://somesite.com"
        cls.url = BROWSE_URL
        login_url = LOGINN_URL + "/authenticate"
        login_req = dict(username=cls.user, password=cls.pwd, service=cls.service)
        r = requests.post(login_url, json=login_req)
        rsp = r.json()
        cls.token = rsp['token']
        cls.image = IMAGE

    def test_upload_browse(self):
        """ Test upload a browse """
        resource = "/browses"
        req = dict(browser=self.user, url=self.service, title="API Tests",
                   token=self.token, shot=self.image)
        r = requests.post(self.url + resource, json=req)
        self.assertEqual(r.status_code, 200)
        rsp = r.json()
        self.assertIsInstance(rsp, dict)
        self.assertIn('browser', rsp)
        self.assertIn('url', rsp)
        self.assertIn('title', rsp)
        self.assertIn('shot', rsp)
        self.assertIn('title', rsp)
        self.assertIn('published', rsp)
        self.__class__.published = rsp['published']
        self.__class__.shot = rsp['shot']

    def test_add_browser_upvote(self):
        """ Test adding upvote to browse """
        resource = "/links/upvote"
        req = dict(browser=self.user, url=self.service,
                   upvote="interesting", token=self.token)
        r = requests.post(self.url + resource, json=req)
        self.assertEqual(r.status_code, 200)
        rsp = r.json()
        self.assertIsInstance(rsp, dict)
        self.assertIn('browser', rsp)
        self.assertIn('url', rsp)
        self.assertIn('upvote', rsp)

    def test_add_browser_view(self):
        """ Test adding view to browse """
        resource = "/links/view"
        req = dict(browser=self.user, url=self.service, token=self.token)
        r = requests.post(self.url + resource, json=req)
        self.assertEqual(r.status_code, 200)
        rsp = r.json()
        self.assertIsInstance(rsp, dict)
        self.assertIn('browser', rsp)
        self.assertIn('url', rsp)

    def test_delete_browse(self):
        """ Test deleting a browse """
        r = requests.get(self.url + "/browses/" + self.user)
        self.assertEqual(r.status_code, 200)
        rsp = r.json()
        resource = "/browses"
        req = dict(browser=self.user, shot=rsp[0]['shot'],
                   token=self.token, published=rsp[0]['published'])
        r = requests.delete(self.url + resource, json=req)
        self.assertEqual(r.status_code, 200)
        rsp = r.json()
        self.assertIn('browser', rsp)
        self.assertIn('shot', rsp)
        self.assertIn('published', rsp)


class TestBrowsesUnauth(unittest.TestCase):
    """
    Test unauthenticated resources.
    """
    @classmethod
    def setUpClass(cls):
        cls.user = "joebloggs"
        cls.pwd = "salted_hash"
        cls.url = BROWSE_URL

    def test_get_latest_browses(self):
        """ Test last 24 hours of browses """
        resource = "/browses"
        r = requests.get(self.url + resource)
        rsp = r.json()
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(rsp, list)
        if len(rsp) > 0:
            self.assertIn('browser', rsp[0])
            self.assertIn('shot', rsp[0])
            self.assertIn('url', rsp[0])

    def test_get_user_browses(self):
        """ Test user browses """
        resource = "/browses/" + self.user
        r = requests.get(self.url + resource)
        rsp = r.json()
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(rsp, list)
        self.assertIn('browser', rsp[0])
        self.assertIn('shot', rsp[0])
        self.assertIn('url', rsp[0])
        self.assertIn('title', rsp[0])
        self.assertIn('browsers', rsp[0])
        self.assertIn('published_first_by', rsp[0])
        self.assertIn('published_first_time', rsp[0])
        self.assertIn('published_last_by', rsp[0])
        self.assertIn('published_last_time', rsp[0])

def main():
    unittest.main(verbosity=2)


IMAGE = """data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAA
AHgAQMAAAAPH06nAAAAA1BMVEX///+nxBvIAAAAPElEQVR42u3BAQ0AAADCIPu
nfg43YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwKJfgA
AHF2U8TAAAAAElFTkSuQmCC"""


if __name__ == '__main__':
    main()
