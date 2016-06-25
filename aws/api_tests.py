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
        rsp = r.json()
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(rsp, dict)
        self.assertIn('browser', rsp)
        self.assertIn('url', rsp)
        self.assertIn('title', rsp)
        self.assertIn('shot', rsp)
        self.assertIn('title', rsp)
        self.assertIn('published_first_time', rsp)

    def test_add_browser_upvote(self):
        """ Test adding upvote to browse """
        resource = "/links/upvote"
        req = dict(browser=self.user, url=self.service,
                   upvote="interesting", token=self.token)
        r = requests.post(self.url + resource, json=req)
        rsp = r.json()
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(rsp, dict)
        self.assertIn('browser', rsp)
        self.assertIn('url', rsp)
        self.assertIn('upvote', rsp)

    def test_add_browser_view(self):
        """ Test adding view to browse """
        resource = "/links/view"
        req = dict(browser=self.user, url=self.service, token=self.token)
        r = requests.post(self.url + resource, json=req)
        rsp = r.json()
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(rsp, dict)
        self.assertIn('browser', rsp)
        self.assertIn('url', rsp)

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

IMAGE = """data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/
2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDg
sLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQU
FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wA
ARCAGSAnoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcI
CQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBka
EII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVW
V1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqr
KztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6
/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBA
cFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYk
NOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dX
Z3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbH
yMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9UK
KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoooo
AKKKKACiiigAooooAKKKKAC...k45oA+y6ik/4+I/91v5ipaik/4+I/8Adb+Yo
AlooooAKKKKACiiigAooooAKKKKAIbz/j2f8P51KOgqK8/49n/D+dSjoKlksWi
iikIKKKKACiiigAooooAhT/j7m/3F/wDZqmooqigooopjCiiigAooooAKKKKAC
op/4P8AeFFFAEtUtb/5A19/1wk/9BNFFIR/McOlLRRTGFFFFAEb/epD1oooASl
9aKKAAUelFFACnqa9e+KpK+AvCABwPsipx/dEkuB9B2FFFAHkZJ6Z4q1p88kFw
GikaNsEZRiDRRQB6V8BoY734hqbhFnKwTMvmjdghDgjPevpjwDDGPBWkYRRmFC
eOpLZNFFAHbpY211Dtnt4plI5WRAw/Wvjr456bZ6Z8RJorO1gtIiAdkEYRc+uA
KKKAPqj9lxQvw/TAA/eHoPYV6DqaL/wkZOBkpDzj3f/AAFFFAGi+m2jzYa1hYN
lmBjHJz1PFeL+OWLa74tckl0urVFY9VURKQB6DJJx6k0UUAch+1o7D4M+GMMR5
t4ryc/fby3OT6n3r5M2j7BEcD7xooqepLPcba7ntv2WLPyZpIt2oXKtscjI54O
O1cr8ZJXPhb4dqXYr/YURwTxRRQho8mFdJ4JJS41NlO1hYTYI6jjFFFUM56X7/
wCApBRRQB1oULaR4AHyjoPYVZtQP3nFFFAH3B+zY7P8HtM3MTteYDJ6Dea+LPi
CxbxZdEkkm7uck/75oooA527AF1b8fwsf0rJ1A/6VJRRQAtt/qR+NQXPJ/Ciig
CCpE6UUUAOooooAK/ab/gkX/wAmny/9jDef+gQ0UUAfa9RSf8fEf+638xRRQBL
RRRQAUUUUAFFFFABRRRQAUUUUAQ3n/Hs/4fzqUdBRRUsli0UUUhBRRRQB/9k="""

if __name__ == '__main__':
    main()
