import { AvatarUtils } from './avatar.utils';

describe('AvatarUtils', () => {

    it('should generate a DiceBear URL with notionists style for person type', () => {
        const url = AvatarUtils.getDiceBearUrl('John Doe', 'person');
        expect(url).toContain('api.dicebear.com/9.x/notionists/svg');
        expect(url).toContain('seed=John%20Doe');
    });

    it('should generate a DiceBear URL with shapes style for instrument type', () => {
        const url = AvatarUtils.getDiceBearUrl('Test ABC', 'instrument');
        expect(url).toContain('api.dicebear.com/9.x/shapes/svg');
        expect(url).toContain('seed=Test%20ABC');
    });

    it('should default to person type when no type is specified', () => {
        const url = AvatarUtils.getDiceBearUrl('Default User');
        expect(url).toContain('notionists');
    });

    it('should use "default" seed when seed is null or undefined', () => {
        const url = AvatarUtils.getDiceBearUrl(null as any);
        expect(url).toContain('seed=default');
    });

    it('should use "default" seed when seed is empty string', () => {
        const url = AvatarUtils.getDiceBearUrl('');
        expect(url).toContain('seed=default');
    });

    it('should trim whitespace from seed', () => {
        const url = AvatarUtils.getDiceBearUrl('  spaces  ');
        expect(url).toContain('seed=spaces');
    });

    it('should encode special characters in seed', () => {
        const url = AvatarUtils.getDiceBearUrl('José María & Co');
        expect(url).toContain('seed=Jos%C3%A9%20Mar%C3%ADa%20%26%20Co');
    });

    it('should append extra params when provided', () => {
        const url = AvatarUtils.getDiceBearUrl('Test', 'person', 'size=128&radius=50');
        expect(url).toContain('&size=128&radius=50');
    });

    it('should not append ampersand when no extra params', () => {
        const url = AvatarUtils.getDiceBearUrl('Test', 'person', '');
        expect(url).not.toMatch(/&$/);
    });
});
