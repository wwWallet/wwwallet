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
						"uri": config.url + "/images/esc-logo.png",
						"uri#integrity": createSRI("esc-logo.png"),
						"alt_text": "ESC Logo"
					},
					"background_color": "#dfe2ee",
					"text_color": "#2c4390"
				},
				"svg_templates": [
					{
						"uri": config.url + "/images/esc-svg-template.svg",
						"uri#integrity": createSRI("esc-svg-template.svg"),
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
					"description": "The given name of the Diploma Holder"
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
					"description": "The family name of the Diploma Holder"
				}
			],
			"svg_id": "lastNameEn"
		},
		{
			"path": [
				"photo"
			],
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
			"path": [
				"QRCode"
			],
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
			"path": ["age_in_years"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Age",
					"description": "Person's age in completed years."
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
					"locale": "en-US",
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
					"description": "Type of enrollment (e.g., undergraduate, postgraduate)."
				}
			]
		},
		{
			"path": ["fatherFirstNameEl"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Father's First Name (Greek)",
					"description": "Father's first name in Greek."
				}
			]
		},
		{
			"path": ["fatherFirstNameEn"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Father's First Name (English)",
					"description": "Father's first name in English."
				}
			]
		},
		{
			"path": ["firstNameEl"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
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
					"locale": "en-US",
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
					"locale": "en-US",
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
					"locale": "en-US",
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
		},
		{
			"path": ["ssn"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Social Security Number",
					"description": "Student's social security number."
				}
			]
		},
		{
			"path": ["ssnCountry"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "SSN Country",
					"description": "Country of the social security number."
				}
			]
		},
		{
			"path": ["tin"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "Tax Identification Number",
					"description": "Student's tax identification number."
				}
			]
		},
		{
			"path": ["tinCountry"],
			"mandatory": true,
			"sd": "always",
			"display": [
				{
					"locale": "en-US",
					"label": "TIN Country",
					"description": "Country of the tax identification number."
				}
			]
		},
	],
}
