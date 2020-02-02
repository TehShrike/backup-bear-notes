#!/usr/bin/env node

const untildify = require(`untildify`)
const buildFilename = require(`./build-filename`)
const mri = require('mri')

const { 'use-tags-as-directories': useTagsAsDirectories } = mri(process.argv.slice(2))

const BEAR_DB = untildify(
	`~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite`
)

const [ ,, outputDirectory ] = process.argv

if (!outputDirectory) {
	process.stderr.write(`You must provide an output directory\n`)
	process.exit(1)
}

main(
	untildify(outputDirectory)
).then(writeFileResults => {
	console.log(`Backed up ${ writeFileResults.length } notes.`)
}).catch(err => {
	process.nextTick(() => {
		throw err
	})
})

async function main(outputDirectory) {
	const path = require(`path`)
	const sqlite = require(`sqlite`)
	const makeDir = require(`make-dir`)
	const pify = require(`pify`)
	const fs = pify(require(`fs`))

	await makeDir(outputDirectory)

	const db = await sqlite.open(BEAR_DB)

	const rows = await db.all(`
		SELECT
			ZSFNOTE.ZTITLE AS title,
			ZSFNOTE.ZTEXT AS text,
			ZSFNOTETAG.ZTITLE AS tag,
			ZSFNOTE.ZTRASHED AS trashed
		FROM
			ZSFNOTE
		LEFT JOIN Z_7TAGS ON ZSFNOTE.Z_PK = Z_7TAGS.Z_7NOTES
		LEFT JOIN ZSFNOTETAG ON Z_7TAGS.Z_14TAGS = ZSFNOTETAG.Z_PK
		ORDER BY LENGTH(tag)`)

	if (useTagsAsDirectories) {
		const tags = Array.from(new Set(rows.map(row => row.tag)))

		await Promise.all(tags.map(tag => {
			const tagDirectory = tag ? tag : 'untagged'

			return makeDir(path.join(outputDirectory, tagDirectory))
		}))
	}

	return Promise.all(
		rows.map(({ title, text, tag, trashed }) => {
			const filename = buildFilename(title)
			const destinationDirectory = !useTagsAsDirectories ?
				outputDirectory : path.join(outputDirectory, tag || `untagged`)

			if (trashed) {
				return fs.unlink(path.join(destinationDirectory, filename))
			}

			return fs.writeFile(path.join(destinationDirectory, filename), text, { encoding: `utf8` })
		})
	)
}