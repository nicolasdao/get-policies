#!/usr/bin/env node

// NOTE: The official inquirer documentation is really good. To know more about the different question types,
// please refer to https://www.npmjs.com/package/inquirer#prompt-types

const program = require('commander')
const inquirer = require('inquirer')
const clipboardy = require('clipboardy')
const { awsManagedPolicies } = require('./src')
require('colors')
const { version } = require('./package.json')
program.version(version) // This is required is you wish to support the --version option.

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

const friendlyName = data => `${data.name} - ARN: ${data.arn}`

const choosePolicies = async (policies) => {
	const { policy } = await inquirer.prompt([
		{ 
			type: 'autocomplete', 
			name: 'policy', 
			message: 'Search AWS policies:',
			pageSize: 20,
			source: function(answersSoFar, input) {
				if (input) 
					return policies
						.filter(r => friendlyName(r).toLowerCase().indexOf(input.toLowerCase()) >= 0)
						.map(r => ({
							name: friendlyName(r),
							value:r
						}))
						.sort((a,b) => a.value.name > b.value.name ? 1 : -1)
				else
					return policies
						.map(r => ({
							name: friendlyName(r),
							value:r
						}))
						.sort((a,b) => a.value.name > b.value.name ? 1 : -1)
			}
		}
	])

	return policy
}

// 1. Creates your first command. This example shows an 'order' command with a required argument
// called 'product' and an optional argument called 'option'.
program
	.command('select')
	.description('Default behavior. Lists/searches the AWS managed policies and copy the selected one to the clipboard. Equivalent to `npx get-policies`') // Optional description
	.action(async () => {
		const policies = await awsManagedPolicies
		const policy = await choosePolicies(policies)

		clipboardy.writeSync(policy.arn)

		console.log(`${policy.arn.bold} copied to your clipboard`.green)
	})

// 2. Deals with cases where no command is passed.
const cmdArgs = [process.argv[0], process.argv[1]]
if (process.argv.length == 2)
	cmdArgs.push('select')

// 3. Starts the commander program
program.parse(cmdArgs) 





