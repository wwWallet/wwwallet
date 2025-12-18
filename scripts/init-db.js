const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function pemToBase64(pem) {
	const base64 = pem
		.replace(/-----BEGIN CERTIFICATE-----/g, '')
		.replace(/-----END CERTIFICATE-----/g, '')
		.replace(/\r?\n|\r/g, '');
	return base64;
}

const acmeVerifierFriendlyName = "ACME Verifier";
const acmeVerifierURL = "http://wallet-enterprise-acme-verifier:8005";
const dbHost = 'wallet-db';
const dbPort = 3307;
const dbUser = 'root';
const dbPassword = 'root';

const issuersTrustedRootCert = pemToBase64(fs.readFileSync(path.join(__dirname, './keystore/wwwallet_org_iaca.pem'), 'utf-8'));
let dockerComposeCommand = 'docker-compose';
try {
	execSync('docker compose version').toString();
	dockerComposeCommand = 'docker compose'
} catch (error) {
	// Fall back to default value
}

const cleanupCredentialIssueTable = `DELETE FROM credential_issuer`;
const firstIssuerInsertion = `INSERT INTO credential_issuer (credentialIssuerIdentifier, clientId, visible) VALUES ('http://localhost:8003/openid', '1233', 1)`;

const cleanupCertificateTable = `DELETE FROM trusted_root_certificate`;
const firstCertificateInsertion = `INSERT INTO trusted_root_certificate (certificate) VALUES ('${issuersTrustedRootCert}')`;


const cleanupVerifierTable = `DELETE FROM verifier`;
const firstVerifierInsertion = `INSERT INTO verifier (name, url) VALUES ('${acmeVerifierFriendlyName}', '${acmeVerifierURL}')`;

execSync(`${dockerComposeCommand} exec -t wallet-db sh -c "
		mariadb -u ${dbUser} -p\\"${dbPassword}\\" wallet -e \\"${cleanupCredentialIssueTable}; ${firstIssuerInsertion}; ${cleanupCertificateTable}; ${firstCertificateInsertion}; ${cleanupVerifierTable}; ${firstVerifierInsertion} \\"
	"`, { stdio: 'inherit' });
