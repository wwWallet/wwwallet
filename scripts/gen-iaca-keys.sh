#!/bin/bash

WORKDIR="./scripts"
rm -rf ${WORKDIR}/keystore
mkdir -p ${WORKDIR}/keystore/
mkdir -p ${WORKDIR}/keystore/crl/
touch ${WORKDIR}/keystore/index.txt
# touch ${WORKDIR}/keystore/serial
# echo "1000" > ${WORKDIR}/keystore/serial

touch ${WORKDIR}/keystore/crl/crlnumber
echo "1000" > ${WORKDIR}/keystore/crl/crlnumber


openssl ecparam -name prime256v1 -genkey -out ${WORKDIR}/keystore/wwwallet_org_iaca.key
openssl req -new -x509 -key ${WORKDIR}/keystore/wwwallet_org_iaca.key -out ${WORKDIR}/keystore/wwwallet_org_iaca.pem -config ${WORKDIR}/cert-configs/wwwallet_org_iaca.cnf -days 5475

openssl ca -gencrl -config ${WORKDIR}/cert-configs/wwwallet_org_iaca.cnf -out ${WORKDIR}/keystore/crl/wwwallet_org_iaca.crl

# generate DER format for CRL
openssl crl -in ${WORKDIR}/keystore/crl/wwwallet_org_iaca.crl -outform DER -out ${WORKDIR}/keystore/crl/wwwallet_org_iaca.crl.der



# convert key to PKCS8 format
KEY_PATH="${WORKDIR}/keystore/wwwallet_org_iaca.key"
openssl pkcs8 -topk8 -inform PEM -in ${KEY_PATH} -outform PEM -out ${KEY_PATH}.pkcs8  -nocrypt

