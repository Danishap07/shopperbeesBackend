import bcrypt from 'bcryptjs'
import User from '../models/users'
import jwt from 'jsonwebtoken'
// import database from '../middlewere/dbConnection';
import asyncHandler from 'express-async-handler'

const login = async (req, res) => {
    const { username, password } = req.body

    if(!username || !password) {
        return res.status(400).json({ message: "All fields are required." })
    }

    const user = await User.findOne({ username }).lean().exec()

    if(!user) {
        return res.status(400).json({ message: "User does not exist." })
    }

    const match = await bcrypt.compare(password, user.password)
    if(!match) {
        return res.status(401).json({ message: "Invalid Password." })
    }

    const access_token = jwt.sign(
        {
            "UserInfo": {
                "username": user.username,
                "roles": user.roles
            }
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1d' }
    )

    const refresh_token = jwt.sign(
        { "username": user.username },
        process.env.REFRESH_TOKEN_SECRET
    )
    res.cookie('jwt', refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 12 * 30 * 24 * 60 * 60 * 1000
    })

    return res.json({ access_token })
}

const refresh = (req, res) => {
    const cookies = req.cookies;
    if(!cookies?.jwt) {
        return res.status(401).json({ message: "Unauthorized: cookie not found" })
    }
    
    const refresh_token = cookies.jwt

    jwt.verify(
        refresh_token, 
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
            if(err) return res.status(403).json({ message: "Forbidden: error in verifying jwt" })
            console.log("hello", decoded)
            
            const user = await User.findOne({ username: decoded.username }).lean().exec();
                if(!user) {
                    return res.status(401).json({ message: "You are Unauthorized" })
                }

                const access_token = jwt.sign(
                    {
                        "UserInfo": {
                            "username": user.username,
                            "roles": user.roles
                        }
                    },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: "1d" }
                )
                res.json({ access_token })
        })
    
}

const logout = (req, res) => {
    const cookies = req.cookies;
    if(!cookies?.jwt) {
        return res.sendStatus(204);
    } 
    res.clearCookie('jwt', { httpOnly: true, sameSite: "None", secure: true })
    res.json({ message: 'Cookies cleared' })

}

export default {
    login,
    refresh,
    logout
}