import {
    getUserById,
    getUsers,
    loginUser,
    registerUser,
    verifyEmail
} from "../controllers/users.js";
import User from "../models/users.js";

export function usersRoutes(app, blacklistedTokens) {
    app.post("/login", async(request, reply) => {
        reply.send(await loginUser(request.body, app));
    }).post(
        "/logout", { preHandler: [app.authenticate] },
        async(request, reply) => {
            const token = request.headers["authorization"].split(" ")[1]; // Récupérer le token depuis l'en-tête Authorization

            // Ajouter le token à la liste noire
            blacklistedTokens.push(token);

            reply.send({ logout: true });
        }
    );
    //inscription
    app.post("/register", async(request, reply) => {
        reply.send(await registerUser(request.body, app.bcrypt));
    });
    //récupération de la liste des utilisateurs
    app.get("/users", async(request, reply) => {
        reply.send(await getUsers());
    });
    //récupération d'un utilisateur par son id
    app.get("/users/:id", async(request, reply) => {
        reply.send(await getUserById(request.params.id));
    });

    app.post("/verifyaccount", async(request, reply) => {
        reply.send(await verifyEmail(request.body));
    });

    app.get('/verify-email', async(req, res) => {
        const { email } = req.query;

        // Rechercher l'utilisateur avec ce token
        const user = await User.findOne({ where: { email: email } });

        if (!user) {
            return res.status(400).send({ error: "Token de vérification invalide." });
        }

        // Vérifier le compte de l'utilisateur
        user.verified = true;
        user.verificationToken = null; // Supprimer le token de vérification après utilisation
        await user.save();

        return res.send({ message: "Votre adresse email a été vérifiée avec succès." });
    });

}