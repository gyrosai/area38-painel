export const metadata = {
  title: "Liga Área 38 — Programa Trimestral",
  description: "Painel de acompanhamento do programa de gamificação",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Manrope substitui a Circular Std, que é licenciada e não pode
            ser servida na web sem a licença da Lineto. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
