import { stringify as stringifyYaml } from 'yaml';

// 转换为YAML格式
function convertToYAML(obj) {
	return stringifyYaml(obj, {
		lineWidth: 0,
		defaultStringType: 'QUOTE_DOUBLE',
		defaultKeyType: 'PLAIN'
	}).replace(/\n$/, '');
}

export { convertToYAML };
