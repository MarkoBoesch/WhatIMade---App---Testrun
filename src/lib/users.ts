import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
}

const DATA_FILE = path.join(process.cwd(), 'data', 'users.json')

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getUsers(): User[] {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) {
    // Seed default users on first run
    const defaults: User[] = [
      {
        id: '1',
        email: 'marko.boesch@gmx.ch',
        name: 'Marko',
        passwordHash: bcrypt.hashSync('admin', 10),
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        email: 't.k.wigand@gmail.com',
        name: 'Tobi',
        passwordHash: bcrypt.hashSync('erdbeertoertli', 10),
        createdAt: new Date().toISOString(),
      },
    ]
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2))
    return defaults
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as User[]
}

export function findUserByEmail(email: string): User | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function addUser(user: Omit<User, 'id' | 'createdAt'>): User {
  const users = getUsers()
  const newUser: User = {
    ...user,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2))
  return newUser
}
