/*
 * getLatestBrowseData
 *
 * Get most recent browses.
 *
 * @url: https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta
 * @resource: /browses
 * @method: GET
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
    const data = browse;
    const link = links.filter((l) => l.url === browse.url);
    if (data.hasOwnProperty('active')) { delete data.active; }
    return Object.assign(data, link[0]);
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
    IndexName: 'publishedIndex',
    KeyConditionExpression: 'active = :ok AND published > :ts',
    ExpressionAttributeValues: {
      ':ok': 'true',
      ':ts': 0,
    },
    ScanIndexForward: false,
    Limit: 5,
  };
  /*
   * If a page is specified then add to the limit, to get more
   * results then return the relevent ones.
   */
  const page = event.page ? (parseInt(event.page, 10) - 1) * 5 : 0;
  if (isNaN(page)) {
    context.fail('Bad Request: Failed to convert page to integer.');
    return;
  }
  params.Limit += page;
  /*
   * Scan browses table for most recent 100 browses.
   */
  dynamo.query(params, (err, data) => {
    if (err) {
      context.fail('Internal Error: Failed to query browses');
      return;
    }
    if (data.Count > page) {
      const browses = data.Items.slice(page);
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
         * Get interests for most recent data from the links table.
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
