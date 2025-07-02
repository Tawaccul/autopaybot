// Для продакшена замените на реальную БД (Firestore, MongoDB и т.д.)
const users = new Map()

module.exports = {
  async getUser(id) {
    return users.get(id.toString()) || { id, subscription: null }
  },
  
  async updateUser(id, data) {
    const user = await this.getUser(id)
    users.set(id.toString(), { ...user, ...data })
  }
}