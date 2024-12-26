function generateUniqueId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `${timestamp}-${random}`;
}

module.exports = {
  generateUniqueId,
};
