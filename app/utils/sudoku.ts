interface CellState {
	value: number | null
	isFixed: boolean
}

// Helper function to format time display
export function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
		.toString()
		.padStart(2, "0")}`
}

// Create an empty 9x9 grid
export function createEmptyGrid(): number[][] {
	return Array(9)
		.fill(null)
		.map(() => Array(9).fill(0))
}

// Check if a number is safe to place in a given position
export function isSafe(
	grid: number[][],
	row: number,
	col: number,
	val: number
): boolean {
	// Check row and column simultaneously to reduce iterations
	for (let x = 0; x < 9; x++) {
		if (grid[row][x] === val || grid[x][col] === val) return false
	}

	// Check 3x3 box
	const startRow = row - (row % 3)
	const startCol = col - (col % 3)
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < 3; c++) {
			if (grid[startRow + r][startCol + c] === val) return false
		}
	}
	return true
}

// Optimized Fisher-Yates shuffle
export function shuffle(array: number[]): number[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

// Fill the grid with valid numbers
export function fillGrid(grid: number[][]): boolean {
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (grid[row][col] === 0) {
				// Use pre-shuffled array to reduce shuffle operations
				const candidates = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
				for (let val of candidates) {
					if (isSafe(grid, row, col, val)) {
						grid[row][col] = val
						if (fillGrid(grid)) return true
						grid[row][col] = 0
					}
				}
				return false
			}
		}
	}
	return true
}

// Generate a new Sudoku puzzle with solution
export function generateSudoku(difficulty: "easy" | "medium" | "hard"): {
	puzzle: number[][]
	solution: number[][]
} {
	const solution = createEmptyGrid()
	fillGrid(solution)
	const puzzle = solution.map((row) => [...row])

	// Adjust clues based on difficulty
	const cluesTarget =
		difficulty === "hard" ? 24 : difficulty === "medium" ? 34 : 40

	// Helper function to count remaining clues
	const countClues = (grid: number[][]) => {
		let count = 0
		for (let r = 0; r < 9; r++) {
			for (let c = 0; c < 9; c++) {
				if (grid[r][c] !== 0) count++
			}
		}
		return count
	}

	// Remove numbers symmetrically until target is reached
	while (countClues(puzzle) > cluesTarget) {
		const row = Math.floor(Math.random() * 9)
		const col = Math.floor(Math.random() * 9)
		if (puzzle[row][col] === 0) continue

		const symRow = 8 - row
		const symCol = 8 - col

		puzzle[row][col] = 0
		puzzle[symRow][symCol] = 0
	}

	return { puzzle, solution }
}

// Calculate valid candidates for a cell
export function calculateCandidates(
	board: CellState[][],
	row: number,
	col: number
): Set<number> {
	if (board[row][col].value !== null) {
		return new Set<number>()
	}

	const candidates = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9])

	// Check row
	for (let c = 0; c < 9; c++) {
		if (board[row][c].value) {
			candidates.delete(board[row][c].value!)
		}
	}

	// Check column
	for (let r = 0; r < 9; r++) {
		if (board[r][col].value) {
			candidates.delete(board[r][col].value!)
		}
	}

	// Check 3x3 box
	const boxRow = Math.floor(row / 3) * 3
	const boxCol = Math.floor(col / 3) * 3
	for (let r = boxRow; r < boxRow + 3; r++) {
		for (let c = boxCol; c < boxCol + 3; c++) {
			if (board[r][c].value) {
				candidates.delete(board[r][c].value!)
			}
		}
	}

	return candidates
}
