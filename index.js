#!/usr/bin/env node

// NOTE: The official inquirer documentation is really good. To know more about the different question types,
// please refer to https://www.npmjs.com/package/inquirer#prompt-types

const program = require('commander')
const inquirer = require('inquirer')
const clipboardy = require('clipboardy')
const { aws } = require('./src')
require('colors')
const { version } = require('./package.json')
program.version(version) // This is required is you wish to support the --version option.

const NO_RESULTS_NEXT_STEP = 'No results... Press enter to move the next step.'

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

const friendlyName = data => `${data.PolicyName} - ARN: ${data.Arn}`

const choosePolicies = async (policies) => {
	const { searchType } = await inquirer.prompt([{
		type: 'list',
		name: 'searchType',
		message: 'How do you to search?',
		choices: ['Text search', 'Advanced filter']
	}])
	
	if (searchType == 'Text search')
		return await textSearchPolicies(policies)
	else 
		return await advanceSearchPolicies(policies)

}

const textSearchPolicies = async (policies) => {
	const { policy } = await inquirer.prompt([
		{ 
			type: 'autocomplete', 
			name: 'policy', 
			message: 'Search AWS policies:',
			pageSize: 20,
			source: function(answersSoFar, input) {
				if (input) 
					return policies
						.filter(r => r.textSearch.indexOf(input.toLowerCase()) >= 0)
						.map(r => ({
							name: friendlyName(r),
							value:r
						}))
						.sort((a,b) => a.value.PolicyName > b.value.PolicyName ? 1 : -1)
				else
					return policies
						.map(r => ({
							name: friendlyName(r),
							value:r
						}))
						.sort((a,b) => a.value.PolicyName > b.value.PolicyName ? 1 : -1)
			}
		}
	])

	return policy
}

const advanceSearchPolicies = async (policies) => {
	// Filter by effect
	const { effect } = await inquirer.prompt([
		{ 
			type: 'list', 
			name: 'effect', 
			message: `Do you wish to ${'Allow'.bold} or ${'Deny'.bold} actions:`,
			choices: ['Allow', 'Deny']
		}
	])
	const effectPolicies = aws.filterPoliciesByEffect(policies, effect)

	// Filter by actions
	const { actions } = aws.getPoliciesPieces(effectPolicies)
	const actionPolicies = await selectActions(effectPolicies, actions)
	
	// Filter by resources
	const { resources } = aws.getPoliciesPieces(actionPolicies)
	const resourcePolicies = await selectResources(actionPolicies, resources)

	// Filter by text
	return await textSearchPolicies(resourcePolicies)
}

const selectActions = async (policies, actions, selectedActions) => {
	if (!selectedActions)
		selectedActions = []

	const choicesCount = actions.length
	const { action } = await inquirer.prompt([
		{ 
			type: 'autocomplete', 
			name: 'action', 
			message: `Add any of the following ${choicesCount} action${choicesCount > 1 ? 's' : ''} to filter managed policies further or click 'next':`,
			pageSize: 20,
			source: function(answersSoFar, input) {
				let results = actions
				if (input)
					results = actions.filter(r => r.toLowerCase().indexOf(input.toLowerCase()) >= 0)

				if (results.length)
					return ['next', ...results.sort((a,b) => a > b ? 1 : -1)]
				else
					return [NO_RESULTS_NEXT_STEP]
			}
		}
	])

	if (action == 'next' || action == NO_RESULTS_NEXT_STEP)
		return policies
	else {
		selectedActions.push(action)
		const newPolicies = aws.filterPoliciesByActions(policies, selectedActions)
		const { actions:updatedActions } = aws.getPoliciesPieces(newPolicies)
		const canSelectMoreActions = updatedActions.some(a => selectedActions.indexOf(a) < 0)
		if (canSelectMoreActions)
			return await selectActions(newPolicies, updatedActions, selectedActions)
		else
			return newPolicies
	}
}

const selectResources = async (policies, resources, selectedResources) => {
	if (!selectedResources)
		selectedResources = []

	const choicesCount = resources.length
	const { resource } = await inquirer.prompt([
		{ 
			type: 'autocomplete', 
			name: 'resource', 
			message: `Add any of the following ${choicesCount} resource${choicesCount > 1 ? 's' : ''} to filter managed policies further or click 'next':`,
			pageSize: 20,
			source: function(answersSoFar, input) {
				let results = resources
				if (input)
					results = resources.filter(r => r.toLowerCase().indexOf(input.toLowerCase()) >= 0)

				if (results.length)
					return ['next', ...results.sort((a,b) => a > b ? 1 : -1)]
				else
					return [NO_RESULTS_NEXT_STEP]
			}
		}
	])

	if (resource == 'next')
		return policies
	else {
		selectedResources.push(resource)
		const newPolicies = aws.filterPoliciesByResources(policies, selectedResources)
		const { resources:updatedResources } = aws.getPoliciesPieces(newPolicies)
		const canSelectMoreResources = updatedResources.some(a => selectedResources.indexOf(a) < 0)
		if (canSelectMoreResources)
			return await selectResources(newPolicies, updatedResources, selectedResources)
		else
			return newPolicies
	}
}

const selectPolicy = async () => {
	const policies = await aws.managedPolicies
	const policy = await choosePolicies(policies)
	
	clipboardy.writeSync(policy.Arn)
	
	console.log(`${policy.Arn.bold} copied to your clipboard`.green)
	console.log('')

	const nextStep01 = `Inspect ${policy.PolicyName}`
	const nextStep02 = 'Select another policy'
	const nextStep03 = 'No, thanks. I\'m done for now.'
	const nextStep04 = 'Copy this policy to clipboard.'
	const { nextStep } = await inquirer.prompt([
		{ 
			type: 'list', 
			name: 'nextStep', 
			message: 'Do you wish to carry on with the following?',
			pageSize: 20,
			choices:[nextStep01, nextStep02, nextStep03]
		}
	])

	if (nextStep == nextStep01) {
		/*eslint-disable */
		const { textSearch, ...rest } = JSON.parse(JSON.stringify(policy))
		/*eslint-enable */
		const policyStr = JSON.stringify(rest,null, '	')
		console.log(policyStr)
		console.log('')
		const resp = await inquirer.prompt([
			{ 
				type: 'list', 
				name: 'nextStep', 
				message: 'Do you wish to carry on with the following?',
				pageSize: 20,
				choices:[nextStep04, nextStep02, nextStep03]
			}
		])
		if (resp.nextStep == nextStep02)
			return await selectPolicy()
		else if (resp.nextStep == nextStep04) {
			clipboardy.writeSync(policyStr)
			console.log('Policy content copied to your clipboard'.green)
			const resp02 = await inquirer.prompt([
				{ 
					type: 'list', 
					name: 'nextStep', 
					message: 'Do you wish to carry on with the following?',
					pageSize: 20,
					choices:[nextStep02, nextStep03]
				}
			])
			if (resp02.nextStep == nextStep02)
				return await selectPolicy()
			else 
				return
		} else 
			return
	} else if (nextStep == nextStep02)
		return await selectPolicy()
	else
		return
}

// 1. Creates your first command. This example shows an 'order' command with a required argument
// called 'product' and an optional argument called 'option'.
program
	.command('select')
	.description('Default behavior. Lists/searches the AWS managed policies and copy the selected one to the clipboard. Equivalent to `npx get-policies`') // Optional description
	.action(selectPolicy)

// 2. Deals with cases where no command is passed.
const cmdArgs = [process.argv[0], process.argv[1]]
if (process.argv.length == 2)
	cmdArgs.push('select')

// 3. Starts the commander program
program.parse(cmdArgs) 





