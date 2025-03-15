export const getInputType = (value) => {
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'number' : 'number';
    }
    return 'text';
};

export const formatValue = (value, type) => {
    if (type === 'checkbox') return value ? true : false;
    if (type === 'number') return value || 0;
    return value || '';
};