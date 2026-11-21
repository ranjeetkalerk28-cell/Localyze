// currentCity is the quick-switch location; city is the default set in Settings.
const currentCityOf = (account) => account.currentCity || account.city;

module.exports = { currentCityOf };
