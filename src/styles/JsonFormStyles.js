export const componentStyles = {
    container: {
        display: 'flex',
        gap: '2rem',
        alignItems: 'stretch',
        minHeight: '100vh'
    },
    formSection: {
        flex: '1',
        minWidth: '400px'
    },
    jsonSection: {
        flex: '1',
        position: 'sticky',
        top: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 40px)' 
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        margin: '8px 0',
        gap: '8px'
    },
    label: {
        width: '150px',
        textAlign: 'left',
        marginRight: 'auto'
    },
    input: {
        flex: '1',
        maxWidth: '300px',
        padding: '4px 8px',
        border: '1px solid #ccc',
        borderRadius: '4px'
    },
    section: {
        marginBottom: '0px'
    },
    nested: {
        paddingLeft: '20px',
        width: '100%',
        boxSizing: 'border-box'
    },
    arrayContainer: {
        width: '100%'
    },
    arrayHeader: {
        fontWeight: 'bold',
        padding: '8px 0'
    },
    jsonOutput: {
        width: '100%',
        minHeight: '100px',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.4',
        resize: 'none',
        overflow: 'auto',
        boxSizing: 'border-box'
    },
    keyApproval: {
        width: '100%',
        minHeight: '200px',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.4'
    }
};