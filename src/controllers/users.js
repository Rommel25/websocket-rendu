import User from "../models/users.js";
import { Op } from "sequelize";
import nodemailer from 'nodemailer';
import mjml2html from 'mjml';

async function generateID(id) {
    const { count } = await findAndCountAllUsersById(id);
    if (count > 0) {
        id = id.substring(0, 5);
        const { count } = await findAndCountAllUsersById(id);
        id = id + (count + 1);
    }
    return id;
}

export async function getUsers() {
    return await User.findAll();
}
export async function getUserById(id) {
    return await User.findByPk(id);
}
export async function findAndCountAllUsersById(id) {
    return await User.findAndCountAll({
        where: {
            id: {
                [Op.like]: `${id}%`,
            },
        },
    });
}
export async function findAndCountAllUsersByEmail(email) {
    return await User.findAndCountAll({
        where: {
            email: {
                [Op.eq]: email,
            },
        },
    });
}
export async function findAndCountAllUsersByUsername(username) {
    return await User.findAndCountAll({
        where: {
            username: {
                [Op.eq]: username,
            },
        },
    });
}
export async function registerUser(userDatas, bcrypt) {
    if (!userDatas) {
        return { error: "Aucune donnée à enregistrer" };
    }
    const { firstname, lastname, username, email, password } = userDatas;
    if (!firstname || !lastname || !username || !email || !password) {
        return { error: "Tous les champs sont obligatoires" };
    }
    //vérification que l'email n'est pas déjà utilisé
    const { count: emailCount } = await findAndCountAllUsersByEmail(email);
    if (emailCount > 0) {
        return { error: "L'adresse email est déjà utilisée." };
    }

    //vérification que le pseudo n'est pas déjà utilisé
    const { count: usernameCount } = await findAndCountAllUsersByUsername(
        username
    );
    if (usernameCount > 0) {
        return { error: "Le nom d'utilisateur est déjà utilisé." };
    }
    //création de l'identifiant
    let id = await generateID(
        (lastname.substring(0, 3) + firstname.substring(0, 3)).toUpperCase()
    );
    //hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password);
    //création de l'utilisateur dans la base de données
    const user = {
        id,
        firstname,
        lastname,
        username,
        email,
        password: hashedPassword,
    };

    await sendVerificationEmail(email);

    return await User.create(user);

}
export async function verifyEmail(userDatas) {
    const { email, password } = userDatas;
    try {

        // Vérifiez et décodez le token
        const user = await User.findOne({
            where: {
                email: email,
            },
        });
        if (!user) {
            return { error: "Utilisateur non trouvé" };
        }

        // Vérifiez si l'utilisateur a déjà vérifié son email
        if (user.verified) {
            return { error: "L'adresse email a déjà été vérifiée." };
        }

        // Mettez à jour l'attribut verified à true
        user.verified = true;
        await user.save();
        console.log("Votre adresse email a été vérifiée avec succès!")

        // return res.status(200).json({ message: "" });

    } catch (error) {
        return { error: "Erreur lors de la vérification du token." + userDatas };
    }
};

const transporter = nodemailer.createTransport({
    service: 'Gmail', // ou tout autre service d'email
    auth: {
        user: 'paul.niggli25@gmail.com',
        pass: 'tbkz gfqx jcyy timn',
    },
});

// Fonction pour envoyer l'email de vérification
async function sendVerificationEmail(toEmail) {
    const verificationLink = `http://localhost:3000/verify-email?email=${toEmail}`;

    // Utilisation de MJML pour générer l'email
    const mjmlContent = `
    <mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text font-size="20px" font-weight="bold">
              Vérification de votre adresse email
            </mj-text>
            <mj-text>
              Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email.
            </mj-text>
            <mj-button href=${verificationLink}>
              Vérifier mon adresse email
            </mj-button>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>`;

    // Convertir MJML en HTML
    const { html } = mjml2html(mjmlContent);

    // Paramètres de l'email
    const mailOptions = {
        from: 'votre-email@gmail.com',
        to: toEmail,
        subject: 'Vérification de votre adresse email',
        html, // Contenu de l'email
    };

    // Envoyer l'email
    await transporter.sendMail(mailOptions);
}


export async function loginUser(userDatas, app) {
    if (!userDatas) {
        return { error: "Aucune donnée n'a été envoyée" };
    }
    const { email, password } = userDatas;
    if (!email || !password) {
        return { error: "Tous les champs sont obligatoires" };
    }
    //vérification que l'email est utilisé
    const { count, rows } = await findAndCountAllUsersByEmail(email);
    if (count === 0) {
        return {
            error: "Il n'y a pas d'utilisateur associé à cette adresse email.",
        };
    } else if (rows[0].verified === false) {
        return {
            error: "Votre compte n'est pas encore vérifié. Veuillez vérifier votre boîte mail.",
        };
    }
    //récupération de l'utilisateur
    const user = await User.findOne({
        where: {
            email: {
                [Op.eq]: email,
            },
        },
    });
    //comparaison des mots de passe
    const match = await app.bcrypt.compare(password, user.password);
    if (!match) {
        return { error: "Mot de passe incorrect" };
    }
    // Générer le JWT après une authentification réussie
    const token = app.jwt.sign({ id: user.id, username: user.username }, { expiresIn: "3h" });
    console.log(token, email)
    return { token };
}