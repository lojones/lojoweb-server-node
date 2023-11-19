function getenvvar(name: string, defaultValue: string): string {
  const value = process.env[name]
  if (value === undefined) {
    return defaultValue
  }
  return value
}

function getMandatoryEnvVar(name: string): string {
  const value = process.env[name]
  if (value === undefined) {
    throw new Error(`Mandatory environment variable ${name} is not set.`)
  }
  return value
}



module.exports = {getenvvar,getMandatoryEnvVar}