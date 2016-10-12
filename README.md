# Browses

A chrome extension that allows you to publish your browsing history


- [API Reference](http://joextodd.s3-eu-west-1.amazonaws.com/api/docs/browses.html)

## Test

To test the API run `npm test` from the aws directory.


## Architecture

```
browses: {
	browser: 10153134439438751
	name: Joe Todd
	published: 1470946837213
	image: http://s3.amazonaws.com/browses/10153134439438751/e0256977-886c-4b30-bdf5-bcc7fdabcbef
	url: http://google.com
}

links: {
	url: http://google.com
	title: Some Website
	browsers: [10153134439438751, 106531369438741]
	first_published: 1470946837213
	first_published_by: 10153134439438751
	last_published: 1470946837213
	last_published_by: 106531369438741
	useful: [10153134439438751, 106531369438741]
	interesting: [10153134439438751]
	entertaining: [106531369438741]
	viewed: 99
}
```
