// Return fresh nested data for every generated configuration.
export function buildGlobalOptions() {
	return {
		"ipv6": true,
		"unified-delay": true,
		"tcp-concurrent": true,
		"find-process-mode": "strict",
		"profile": {
			"store-selected": true,
			"store-fake-ip": true
		},
		"sniffer": {
			"enable": true,
			"force-dns-mapping": true,
			"parse-pure-ip": true,
			"override-destination": false,
			"sniff": {
				"HTTP": {
					"ports": [
						80,
						"8080-8880"
					],
					"override-destination": true
				},
				"TLS": {
					"ports": [
						443,
						8443
					]
				},
				"QUIC": {
					"ports": [
						443,
						8443
					]
				}
			},
			"skip-domain": [
				"Mijia Cloud",
				"+.push.apple.com"
			]
		}
	};
}
