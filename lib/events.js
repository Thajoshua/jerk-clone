const config = require('../config');
const PREFIX = config.HANDLERS || '';
const commands = [];

function Index(info, func) {
	const types = ['image', 'text', 'video', 'sticker', 'audio', 'utility', 'misc', 'group', 'download', 'search', 'tools'];
	
	const infos = {
		pattern: info.pattern,
		fromMe: info.fromMe ?? true,
		onlyGroup: info.onlyGroup ?? false,
		onlyPm: info.onlyPm ?? false,
		desc: info.desc ?? '',
		type: types.includes(info.type) ? info.type : 'misc',
		dontAddCommandList: info.dontAddCommandList ?? false,
		function: func
	};

	if (info.pattern) {
		infos.pattern = new RegExp(`^${PREFIX}\\s*${info.pattern}\\b(?:\\s|$)`, 'is');
	} else {
		infos.on = 'message';
		infos.fromMe = false;
	}

	commands.push(infos);
	return infos;
}

module.exports = {
	addCommand: Index,
	Index,
	commands,
	PREFIX: config.HANDLERS?.trim() || '',
	mode: config.MODE == 'public' ? false : true
};