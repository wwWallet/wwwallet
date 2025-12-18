#!/bin/bash

WORKDIR="./scripts"


if [ -z "$1" ]; then
  echo "Project name argument is missing"
  echo "Usage: ./scripts/gen-dsc-keys.sh [PROJECT NAME]"
  exit 1
fi

PROJECT_NAME=$1

# configure the projects cnf file (change SANs, CRLs, CN, etc.)
cp ${WORKDIR}/cert-configs/wwwallet_org_dsc.template.cnf ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org_dsc.cnf
vi ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org_dsc.cnf

echo "${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org_dsc.cnf written on disk"

# generate private key with algorithm ES256
KEY_PATH=${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org.key
openssl ecparam -name prime256v1 -genkey -out $KEY_PATH

echo "Generated private key with algorithm ES256"

# convert to PKCS8 format
openssl pkcs8 -topk8 -inform PEM -in ${KEY_PATH} -outform PEM -out ${KEY_PATH}.pkcs8  -nocrypt

# create Certificate Signing Request to send it to the IACA (generates .csr)
openssl req -new -config ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org_dsc.cnf -key ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org.key -out ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org.csr
echo "Generated CSR for DSC and stored to ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org.csr"

# IACA accepts Certificate Signing Request and generates the certificate for the new project
openssl x509 -req -CA ${WORKDIR}/keystore/wwwallet_org_iaca.pem -CAcreateserial -CAserial ${WORKDIR}/keystore/serial -CAkey ${WORKDIR}/keystore/wwwallet_org_iaca.key -days 365 -extfile ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org_dsc.cnf -extensions dsc_ext -in ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org.csr -out ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org.pem

echo "Generated certificate on path ${WORKDIR}/keystore/${PROJECT_NAME}_wwwallet_org.pem"