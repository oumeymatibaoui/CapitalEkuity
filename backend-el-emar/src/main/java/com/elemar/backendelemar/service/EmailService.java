package com.elemar.backendelemar.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${app.mail.from:no-reply@ske.emar.com.tn}")
    private String fromEmail;

    @Value("${app.mail.name:Plateforme El Emar}")
    private String fromName;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    public boolean sendHtmlEmail(String to, String subject, String htmlBody) {
        if (!mailEnabled) {
            System.out.println("EMAIL DISABLED -> " + to + " | " + subject);
            return false;
        }

        if (to == null || to.trim().isEmpty()) {
            System.out.println("EMAIL NON ENVOYÉ : destinataire vide.");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    "UTF-8"
            );

            helper.setFrom(fromEmail, fromName);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);

            System.out.println("EMAIL ENVOYÉ -> " + to + " | " + subject);
            return true;

        } catch (Exception e) {
            System.err.println("ERREUR ENVOI EMAIL -> " + to + " | " + subject);
            e.printStackTrace();
            return false;
        }
    }

    public void sendNotificationCandidatEmail(
            String to,
            String nomDestinataire,
            String titre,
            String message
    ) {
        String html = """
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
                    <h2 style="color:#1d2d68;">Notification El Emar</h2>

                    <p>Bonjour <strong>%s</strong>,</p>

                    <p>Vous avez reçu une nouvelle notification concernant votre candidature.</p>

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px;margin:16px 0;">
                        <h3 style="margin-top:0;color:#0f172a;">%s</h3>
                        <p>%s</p>
                    </div>

                    <p>
                        Merci de vous connecter à la plateforme pour consulter le détail.
                    </p>

                    <p>
                        <a href="%s"
                           style="background:#1d2d68;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
                            Accéder à la plateforme
                        </a>
                    </p>

                    <p style="color:#64748b;font-size:13px;">
                        Ceci est un message automatique. Merci de ne pas répondre à cet email.
                    </p>
                </div>
                """.formatted(
                safe(nomDestinataire),
                safe(titre),
                safe(message),
                frontendUrl
        );

        sendHtmlEmail(
                to,
                "Nouvelle notification - El Emar",
                html
        );
    }

    public void sendDecisionCandidatEmail(
            String to,
            String nomDestinataire,
            String lot,
            String decision,
            String observation
    ) {
        String subject = "Décision sur votre dossier - El Emar";

        String html = """
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
                    <h2 style="color:#1d2d68;">Décision El Emar</h2>

                    <p>Bonjour <strong>%s</strong>,</p>

                    <p>Une décision a été enregistrée concernant votre dossier de candidature.</p>

                    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px;margin:16px 0;">
                        <p><strong>Lot :</strong> %s</p>
                        <p><strong>Décision :</strong> %s</p>
                        <p><strong>Observation :</strong> %s</p>
                    </div>

                    <p>
                        Merci de consulter la plateforme El Emar pour plus de détails.
                    </p>

                    <p>
                        <a href="%s"
                           style="background:#1d2d68;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
                            Accéder à la plateforme
                        </a>
                    </p>

                    <p style="color:#64748b;font-size:13px;">
                        Ceci est un message automatique. Merci de ne pas répondre à cet email.
                    </p>
                </div>
                """.formatted(
                safe(nomDestinataire),
                safe(lot),
                safe(decision),
                safe(observation),
                frontendUrl
        );

        sendHtmlEmail(to, subject, html);
    }

    public boolean sendPasswordResetEmail(
            String to,
            String nomDestinataire,
            String resetLink
    ) {
        String html = """
            <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
                <h2 style="color:#1d2d68;">Réinitialisation du mot de passe</h2>

                <p>Bonjour <strong>%s</strong>,</p>

                <p>
                    Vous avez demandé la réinitialisation de votre mot de passe
                    sur la plateforme El Emar.
                </p>

                <p>
                    Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                </p>

                <p style="margin:25px 0;">
                    <a href="%s"
                       style="background:#1d2d68;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
                        Réinitialiser mon mot de passe
                    </a>
                </p>

                <p>Si le bouton ne fonctionne pas, copiez ce lien :</p>

                <p style="word-break:break-all;color:#1d4ed8;">
                    %s
                </p>

                <p style="color:#64748b;font-size:13px;">
                    Ce lien est temporaire. Si vous n’avez pas demandé cette action, ignorez cet email.
                </p>
            </div>
            """.formatted(
                safe(nomDestinataire),
                safe(resetLink),
                safe(resetLink)
        );

        return sendHtmlEmail(
                to,
                "Réinitialisation de votre mot de passe - El Emar",
                html
        );
    }

    private String safe(String value) {
        return value == null || value.trim().isEmpty()
                ? "-"
                : value.trim();
    }

}