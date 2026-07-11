export class AvatarUtils {
    /**
     * Reglas globales y permanentes de estilos de DiceBear.
     * 
     * - 'notionists': Para entidades basadas en personas reales (Gestores, Admisiones, Suscriptores, Usuarios).
     * - 'shapes': Para entidades abstractas o instrumentos de sistema (Tests, Baterías, Encuestas, Casos, Bitácoras, etc).
     */

    public static getDiceBearUrl(seed: string, type: 'person' | 'instrument' = 'person', extraParams: string = ''): string {
        const cleanSeed = encodeURIComponent(seed?.trim() || 'default');

        let style = 'notionists'; // Default para personas (gestores, admisiones, usuarios)

        if (type === 'instrument') {
            style = 'shapes'; // Default para tests, baterias, encuestas, etc.
        }

        return `https://api.dicebear.com/9.x/${style}/svg?seed=${cleanSeed}${extraParams ? '&' + extraParams : ''}`;
    }
}
