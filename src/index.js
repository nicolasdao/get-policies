const https = require('https')

const DB = 'https://raw.githubusercontent.com/nicolasdao/get-raw-policies/master/managed-policies.json'

/**
 * Gets all the actions from a policiy document.
 * 
 * @param  {[String]} statement[].Action
 * 
 * @return {[String]} actions
 */
const getActions = statement => {
	if (Array.isArray(statement))
		return statement.reduce((acc,s) => {
			if (s && s.Action) {
				if (Array.isArray(s.Action))
					acc.push(...s.Action)
				else if (typeof(s.Action) == 'string')
					acc.push(s.Action)
			}
			return acc
		},[])
	else if (typeof(statement) == 'object' && statement.Action) {
		if (Array.isArray(statement.Action))
			return statement.Action
		else if (typeof(statement.Action) == 'string')
			return [statement.Action]
		else
			return []
	}
}

const getPoliciesPieces = policies => {
	const { actions, resources } = policies.reduce((acc,policy) => {
		if (policy && policy.Document && policy.Document.Statement) {
			// Get actions
			const actions = getActions(policy.Document.Statement)
			actions.forEach(action => acc.actions[action] = true)

			// Get resources
			if (Array.isArray(policy.Document.Statement))
				policy.Document.Statement.forEach(s => {
					if (Array.isArray(s.Resource))
						s.Resource.forEach(r => r ? acc.resources[r] = true : null)
					else if (s.Resource)
						acc.resources[s.Resource] = true
				})
			else if (policy.Document.Statement.Resource)
				if (Array.isArray(policy.Document.Statement.Resource))
					policy.Document.Statement.Resource.forEach(r => r ? acc.resources[r] = true : null)
				else if (policy.Document.Statement.Resource)
					acc.resources[policy.Document.Statement.Resource] = true	
		}
		return acc
	}, { actions:{}, resources:{} })

	return {
		actions: Object.keys(actions).sort((a,b) => a < b ? -1 : 1),
		resources: Object.keys(resources).sort((a,b) => a < b ? -1 : 1)
	}
}

const filterPoliciesByEffect = (policies, effect) => {
	if (!effect)
		return policies||[]

	return (policies||[]).reduce((acc,policy) => {
		if (policy && policy.Document && policy.Document.Statement) {
			if (Array.isArray(policy.Document.Statement)) {
				const matchingStatements = policy.Document.Statement.filter(s => s.Effect == effect)
				if (matchingStatements[0]) {
					const newPolicy = JSON.parse(JSON.stringify(policy))
					newPolicy.Document.Statement = matchingStatements
					acc.push(newPolicy)	
				}
			} else if (policy.Document.Statement.Effect == effect)
				acc.push(policy)				
		}

		return acc
	}, [])
}

const filterPoliciesByActions = (policies, actions) => {
	if (!actions || !actions.length)
		return policies||[]

	return (policies||[]).reduce((acc,policy) => {
		if (policy && policy.Document && policy.Document.Statement) {
			if (Array.isArray(policy.Document.Statement)) {
				const matchingStatements = policy.Document.Statement.filter(s => {
					if (Array.isArray(s.Action))
						return actions.every(a => s.Action.indexOf(a) >= 0)
					else if (typeof(s.Action) == 'string')
						return actions.every(a => a == s.Action)
					else
						return false
				})
				if (matchingStatements[0]) {
					const newPolicy = JSON.parse(JSON.stringify(policy))
					newPolicy.Document.Statement = matchingStatements
					acc.push(newPolicy)	
				}
			} else if (policy.Document.Statement.Action) {
				const matches = Array.isArray(policy.Document.Statement.Action)
					? actions.every(a => policy.Document.Statement.Action.indexOf(a) >= 0)
					: typeof(policy.Document.Statement.Action) == 'string'
						? actions.every(a => a == policy.Document.Statement.Action)
						: false
				if (matches)
					acc.push(policy)		
			}		
		}

		return acc
	}, [])
}

const filterPoliciesByResources = (policies, resources) => {
	if (!resources || !resources.length)
		return policies||[]

	return (policies||[]).reduce((acc,policy) => {
		if (policy && policy.Document && policy.Document.Statement) {
			if (Array.isArray(policy.Document.Statement)) {
				const matchingStatements = policy.Document.Statement.filter(s => {
					if (Array.isArray(s.Resource))
						return resources.every(a => s.Resource.indexOf(a) >= 0)
					else if (typeof(s.Resource) == 'string')
						return resources.every(a => a == s.Resource)
					else
						return false
				})
				if (matchingStatements[0]) {
					const newPolicy = JSON.parse(JSON.stringify(policy))
					newPolicy.Document.Statement = matchingStatements
					acc.push(newPolicy)	
				}
			} else if (policy.Document.Statement.Resource) {
				const matches = Array.isArray(policy.Document.Statement.Resource)
					? resources.every(a => policy.Document.Statement.Resource.indexOf(a) >= 0)
					: typeof(policy.Document.Statement.Resource) == 'string'
						? resources.every(a => a == policy.Document.Statement.Resource)
						: false
				if (matches)
					acc.push(policy)		
			}		
		}

		return acc
	}, [])
}

const httpGet = url => new Promise((next, fail) => https.get(url, res => {
	let data = []
	
	res.on('data', chunk => {
		data.push(chunk)
	})

	res.on('end', () => {
		const policies = Object.entries(JSON.parse(Buffer.concat(data).toString())).map(([,policy]) => {
			if (!policy)
				policy = {}

			policy.textSearch = `${policy.Arn} ${policy.PolicyName} ${policy.PolicyId}`.toLowerCase()
			return policy
		})

		next(policies)
	})
}).on('error', err => {
	fail(err)
}))

const awsManagedPolicies = httpGet(DB)

module.exports = {
	aws: {
		managedPolicies: awsManagedPolicies,
		filterPoliciesByEffect,
		filterPoliciesByActions,
		filterPoliciesByResources,
		getPoliciesPieces
	}
}