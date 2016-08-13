/*
 * getUserBrowseData
 *
 * Get a particular browsers history and interests.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses/{browser}
 * @method: GET
 * @returns:
 *      - Array:
 *        - id: browse id [string]
 *        - browser: Facebook user id [string]
 *        - name: Facebook name [string]
 *        - shot: link to screenshot in S3 [string]
 *        - url: link to browse [string]
 *        - published: time this browse was posted in ms [integer]
 *        - published_first_time: utc time published first in ms [integer]
 *        - published_last_time: utc time published last in ms [integer]
 *        - published_first_by: browser who first published [string]
 *        - published_last_by: browser who last published [string]
 *        - title: title of page [string]
 *        - browsers: array of browsers of this link [array][strings]
 * @test: npm test
 */
const aws = require('aws-sdk');
aws.config.region = 'eu-west-1';
const dynamo = new aws.DynamoDB.DocumentClient({ region: 'eu-west-1' });

/*
 * Remove duplicates from an array.
 */
function uniq(a) {
  return a.sort().filter((item, pos, ary) => !pos || item !== ary[pos - 1]);
}

/*
 * Merge browses and links.
 */
function merge(browses, links) {
  return browses.map((browse) => {
    const link = links.filter((l) => l.url === browse.url);
    return Object.assign(browse, link[0]);
  });
}

/*
 * Convert from amazon array data types.
 */
function convert(data, items) {
  const newData = data;
  items.forEach(item => {
    if (data.hasOwnProperty(item)) {
      newData[item] = data[item].values;
    }
  });
  return newData;
}


exports.handle = function handler(event, context) {
  const params = {
    TableName: 'browses',
    FilterExpression: 'browser = :bsr',
    ExpressionAttributeValues: {
      ':bsr': event.browser,
    },
  };
  /*
   * Query entries in browses table for browsers browses.
   */
  dynamo.scan(params, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to query database.');
      return;
    }
    if (data.Count > 0) {
      const browses = data.Items;
      const links = uniq(browses.map(item => item.url));
      const linkObjs = links.map(item => {
        const obj = { url: item };
        return obj;
      });
      if (linkObjs.length > 0) {
        const batchParams = {
          RequestItems: {
            links: {
              Keys: linkObjs,
            },
          },
        };
        /*
         * Batch get all of browsers interests from links table.
         */
        dynamo.batchGet(batchParams, (batchErr, batchData) => {
          if (err) {
            context.fail('Internal Error: Failed to batch get interests');
            return;
          }
          const linkData = [];
          batchData.Responses.links.forEach(link => {
            linkData.push(convert(link, ['browsers', 'interesting', 'useful', 'entertaining']));
          });
          context.succeed(merge(browses, linkData));
        });
      } else {
        context.succeed(links);
      }
    } else {
      context.succeed([]);
    }
  });
};
