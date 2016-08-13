/*
 * getLatestBrowseData
 *
 * Get all browses from the last 24 hours.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: GET
 * @returns:
 *      - Array:
 *        - id: browse id [string]
 *        - browser: Facebook id [string]
 *        - name: Facebook name [string]
 *        - shot: link to screenshot in S3 [string]
 *        - url: link to browse [string]
 *        - published: utc time published in ms [integer]
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
  const lastDay = new Date().getTime() - (24 * 60 * 60 * 1000);
  const params = {
    TableName: 'browses',
    FilterExpression: 'published > :lday',
    ExpressionAttributeValues: {
      ':lday': lastDay,
    },
  };

  /*
   * Scan browses table for last 24 hours worth of data.
   */
  dynamo.scan(params, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to scan browses');
      return;
    }
    if (data.Count > 0) {
      const browses = data.Items;
      const links = uniq(browses.map((item) => item.url));
      const linkObjs = links.map((item) => {
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
         * Get interests for the last 24 hours worth of data
         * from the links table.
         */
        dynamo.batchGet(batchParams, (batchErr, batchData) => {
          if (batchErr) {
            context.fail('Internal Error: Failed to batch get interests.');
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
