import { config } from "../../config";
import { createSRI } from "../sriGenerator";

export const escMetadata = {
	"vct": 'urn:credential:esc',
	"name": "ESC VC Type Metadata",
	"description": "This is a European Student Card verifiable credential",
	"display": [
		{
			"locale": "en-US",
			"name": "ESC",
			"description": "European Student Card SD-JWT VC",
			"rendering": {
				"simple": {
					"logo": {
						"uri": config.url + "/images/diploma-logo.png",
						"uri#integrity": createSRI("diploma-logo.png"),
						"alt_text": "ESC Logo"
					},
					"background_color": "#b1d3ff",
					"text_color": "#050708"
				},
				"svg_templates": [
					{
						"uri": config.url + "/images/diploma-svg-template.svg",
						"uri#integrity": createSRI("diploma-svg-template.svg"),
					}
				],
			}
		}
	],
	"claims": [
		{
			"path": ["given_name"],
			"display": [
				{
					"locale": "en-US",
					"label": "Given Name",
					"description": "The given name of the Diploma Holder"
				}
			],
			"svg_id": "given_name"
		},
		{
			"path": ["family_name"],
			"display": [
				{
					"locale": "en-US",
					"label": "Family Name",
					"description": "The family name of the Diploma Holder"
				}
			],
			"svg_id": "family_name"
		},
		{
			"path": [
				"picture"
			],
			"sd": "always",
			"svg_id": "picture",
			"display": [
				{
					"locale": "en-US",
					"label": "Picture"
				}
			]
		},
	],
}
