const https = require('https')

const GIST = 'https://gist.githubusercontent.com/nicolasdao/c54338247534c7d32f6dd21b045cb170/raw'

const httpGet = url => new Promise((next, fail) => https.get(url, res => {
	let data = []
	
	res.on('data', chunk => {
		data.push(chunk)
	})

	res.on('end', () => {
		next(JSON.parse(Buffer.concat(data).toString()))
	})
}).on('error', err => {
	fail(err)
}))

const awsManagedPolicies = httpGet(`${GIST}/aws_managed_policies.json`)

module.exports = {
	awsManagedPolicies
}