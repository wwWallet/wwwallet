import { config } from "../../../config";
import { createSRI } from "../../sriGenerator";

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
						"uri": config.url + "/images/esc-logo.png",
						"uri#integrity": createSRI("esc-logo.png"),
						"alt_text": "ESC Logo"
					},
					"background_color": "#dfe2ee",
					"text_color": "#2c4390"
				},
				"svg_templates": [
					{
						"uri": config.url + "/images/esc-svg-template-landscape.svg",
						"uri#integrity": createSRI("esc-svg-template-landscape.svg"),
						"properties": {
							"orientation": "landscape"
						}
					},
					{
						"uri": config.url + "/images/esc-svg-template.svg",
						"uri#integrity": createSRI("esc-svg-template.svg"),
						"properties": {
							"orientation": "portrait"
						}
					}
				],
			}
		}
	],
	"claims": [
		{
			"path": ["firstNameEn"],
			"display": [
				{
					"locale": "en-US",
					"label": "Given Name",
					"description": "The given name of the student."
				}
			],
			"svg_id": "firstNameEn"
		},
		{
			"path": ["lastNameEn"],
			"display": [
				{
					"locale": "en-US",
					"label": "Family Name",
					"description": "The family name of the student."
				}
			],
			"svg_id": "lastNameEn"
		},
		{
			"path": ["photo"],
			"sd": "always",
			"svg_id": "photo",
			"display": [
				{
					"locale": "en-US",
					"label": "Picture"
				}
			]
		},
		{
			"path": ["QRCode"],
			"sd": "always",
			"svg_id": "QRCode",
			"display": [
				{
					"locale": "en-US",
					"label": "QR Code"
				}
			]
		},
		{
			"path": ["cardNumber"],
			"mandatory": true,
			"sd": "always",
			"svg_id": "cardNumber",
			"display": [
				{
					"locale": "en-US",
					"label": "Card Number",
					"description": "Unique identifier of the ESC card."
				}
			]
		},
		{
			"path": ["issuedAt"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Issue Date",
					"description": "Date when the card was issued."
				}
			]
		},
		{
			"path": ["expiresAt"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Expiry Date",
					"description": "Date when the card expires."
				}
			]
		},
		{
			"path": ["organizationIdentifier"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Organization Identifier",
					"description": "Identifier of the issuing organization."
				}
			]
		},
		{
			"path": ["displayName"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Display Name",
					"description": "Human-readable name of the credential."
				}
			]
		},
		{
			"path": ["institutionName"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Institution Name",
					"description": "Name of the issuing institution."
				}
			]
		},
		{
			"path": ["schacHomeOrganization"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Home Organization",
					"description": "SCHAC home organization identifier."
				}
			]
		},
		{
			"path": ["fullLabel"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Full Label",
					"description": "Full label combining institution and credential information."
				}
			]
		},
		{
			"path": ["academicLevel"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Academic Level",
					"description": "Academic level of the student."
				}
			]
		},
		{
			"path": ["esi"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "European Student Identifier",
					"description": "Unique European Student Identifier."
				}
			]
		},
		{
			"path": ["academicId"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Academic ID",
					"description": "Academic identifier assigned by the institution."
				}
			]
		},
		{
			"path": ["birthDate"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Date of Birth",
					"description": "Full birth date of the student."
				}
			]
		},
		{
			"path": ["birthYear"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Birth Year",
					"description": "Year in which the student was born."
				}
			]
		},
		{
			"path": ["departmentEl"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "el",
					"label": "Department (Greek)",
					"description": "Name of the department in Greek."
				}
			]
		},
		{
			"path": ["departmentEn"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Department (English)",
					"description": "Name of the department in English."
				}
			]
		},
		{
			"path": ["departmentId"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Department ID",
					"description": "Identifier of the department."
				}
			]
		},
		{
			"path": ["enrollmentTerm"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Enrollment Term",
					"description": "Current enrollment term."
				}
			]
		},
		{
			"path": ["enrollmentType"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Enrollment Type",
					"description": "Type of enrollment."
				}
			]
		},
		{
			"path": ["firstNameEl"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "el",
					"label": "First Name (Greek)",
					"description": "Student's first name in Greek."
				}
			]
		},
		{
			"path": ["inscriptionAcYear"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Inscription Academic Year",
					"description": "Academic year of inscription."
				}
			]
		},
		{
			"path": ["inscriptionTerm"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Inscription Term",
					"description": "Term of inscription."
				}
			]
		},
		{
			"path": ["lastNameEl"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "el",
					"label": "Last Name (Greek)",
					"description": "Student's last name in Greek."
				}
			]
		},
		{
			"path": ["middleNameEl"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "el",
					"label": "Middle Name (Greek)",
					"description": "Student's middle name in Greek."
				}
			]
		},
		{
			"path": ["middleNameEn"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Middle Name (English)",
					"description": "Student's middle name in English."
				}
			]
		},
		{
			"path": ["programEl"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "el",
					"label": "Program (Greek)",
					"description": "Name of the academic program in Greek."
				}
			]
		},
		{
			"path": ["programEn"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Program (English)",
					"description": "Name of the academic program in English."
				}
			]
		},
		{
			"path": ["programId"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Program ID",
					"description": "Identifier of the academic program."
				}
			]
		},
		{
			"path": ["registrationId"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Registration ID",
					"description": "Student's registration identifier."
				}
			]
		}
	]
}
