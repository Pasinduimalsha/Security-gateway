const jwt = require('jsonwebtoken');

const authMiddleware = async (req, resp, next) => {
    try {
        const authHeader = req.headers['authorization'];
        console.log("Auth Header:", authHeader);
        if(!authHeader){
            return resp.status(401).json({'message': 'authentication header is missing'});
        }
        const token = authHeader.split(" ")[1];
    
        if(!token){
            return resp.status(401).json({'message': 'authentication token is missing'});
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        // I placed the entire decoded token onto req.user so you have access to username, role, and clearance
        req.user = decodedToken; 
        next();

    } catch (e) {
        resp.status(401).json({'message': 'Invalid or expired token'})
        console.log(e);
    }
}

module.exports = {authMiddleware};
