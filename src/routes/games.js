import { createGame, updateGame, getAllGames, getUserGames } from "../controllers/games.js";
export function gamesRoutes(app) {
    //création d'un jeu
    app.post(
        "/game", { preHandler: [app.authenticate] },
        async(request, reply) => {
            reply.send(await createGame(request.body.userId));
        }
    );
    //rejoindre un jeu
    app.patch(
        "/game/:action/:gameId", { preHandler: [app.authenticate] },
        async(request, reply) => {
            reply.send(await updateGame(request));
        }
    );

    app.get(
        "/games", { preHandler: [app.authenticate] },
        async(request, reply) => {
            const games = await getAllGames();
            reply.send(games);
        }
    );

    // Récupérer les parties d'un utilisateur spécifique
    app.get(
        "/user/games", { preHandler: [app.authenticate] },
        async(request, reply) => {
            const userId = request.user.id; // Assurez-vous que l'ID de l'utilisateur est disponible dans la requête
            const userGames = await getUserGames(userId);
            reply.send(userGames);
        }
    );

}