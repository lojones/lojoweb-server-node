export const getSafeValue = (value: string | undefined) => {
    return value ? value : '';
}