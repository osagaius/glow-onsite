import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.SECRET || 'some secret string', (err, user) => {
            if (err) {
                return res.status(401).json({ error: 'not authorized' });
            }

            req.username = (user as any).username;
            next();
        });
    } else {
        res.status(401).json({ error: 'not authorized' });
    }
};

export default authenticateJWT;
