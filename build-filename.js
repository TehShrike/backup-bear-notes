module.exports = title => {
    return `${title.replace(/\//g, "-")}.md`
}